-- نظام الحقائب التدريبية: الأدوار الثلاثة + الجداول الإضافية + التخزين
-- الأدوار: admin (المدير) / project_manager (مديرة المشاريع) / staff (موظف)
-- الملف آمن لإعادة التشغيل أكثر من مرة (idempotent).

------------------------------------------------------------------
-- 1) دوال مساعدة للأدوار
------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.role::text = 'admin' from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.role::text in ('admin','project_manager') from public.profiles p where p.id = auth.uid()), false)
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager() to authenticated;

------------------------------------------------------------------
-- 2) جدول البيانات الإضافية للحقيبة (المحتوى العلمي ودليل الطالب ...)
------------------------------------------------------------------
create table if not exists public.bag_extras (
  bag_id        uuid primary key references public.training_bags(id) on delete cascade,
  scientific    jsonb not null default '{}'::jsonb,   -- المحتوى العلمي حسب الأيام + المخرج المرجعي + المراجع
  student_guide jsonb not null default '{}'::jsonb,   -- دليل الطالب
  checklist     jsonb not null default '[]'::jsonb,   -- اكتمال الحقيبة (6 بنود)
  approvals     jsonb not null default '{}'::jsonb,   -- التوقيعات والاعتماد
  output_images jsonb not null default '{}'::jsonb,   -- الصور المرجعية للمخرجات {رقم المخرج: [{path,name}]}
  attachments   jsonb not null default '{}'::jsonb,   -- مرفقات الحقيبة {key: {path,name}}
  staff_notes   text,
  updated_at    timestamptz not null default now()
);

alter table public.bag_extras enable row level security;

drop policy if exists bag_extras_select on public.bag_extras;
create policy bag_extras_select on public.bag_extras for select to authenticated
using (
  public.is_manager()
  or exists (select 1 from public.training_bags b where b.id = bag_extras.bag_id and b.owner_id = auth.uid())
);

drop policy if exists bag_extras_insert on public.bag_extras;
create policy bag_extras_insert on public.bag_extras for insert to authenticated
with check (
  public.is_manager()
  or exists (select 1 from public.training_bags b where b.id = bag_extras.bag_id and b.owner_id = auth.uid())
);

drop policy if exists bag_extras_update on public.bag_extras;
create policy bag_extras_update on public.bag_extras for update to authenticated
using (
  public.is_manager()
  or exists (select 1 from public.training_bags b where b.id = bag_extras.bag_id and b.owner_id = auth.uid())
)
with check (
  public.is_manager()
  or exists (select 1 from public.training_bags b where b.id = bag_extras.bag_id and b.owner_id = auth.uid())
);

drop policy if exists bag_extras_delete on public.bag_extras;
create policy bag_extras_delete on public.bag_extras for delete to authenticated
using (public.is_admin());

------------------------------------------------------------------
-- 3) صلاحيات المدير ومديرة المشاريع على الجداول الحالية (سياسات إضافية فقط)
--    مديرة المشاريع والمدير: قراءة كل شيء.  المدير: تعديل كل شيء.
------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'training_bags','program_details','objectives','outputs','output_measurements',
    'implementation_days','human_resources','material_resources','readiness_items','reviews','departments'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists mgr_select on public.%I', t);
      execute format('create policy mgr_select on public.%I for select to authenticated using (public.is_manager())', t);
      execute format('drop policy if exists admin_all on public.%I', t);
      execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    end if;
  end loop;
end $$;

-- مديرة المشاريع تغيّر حالة الحقيبة وتسجّل قرار المراجعة
drop policy if exists mgr_update on public.training_bags;
create policy mgr_update on public.training_bags for update to authenticated
using (public.is_manager()) with check (public.is_manager());

do $$
begin
  if to_regclass('public.reviews') is not null then
    execute 'drop policy if exists mgr_insert on public.reviews';
    execute 'create policy mgr_insert on public.reviews for insert to authenticated with check (public.is_manager())';
    -- صاحب الحقيبة يرى ملاحظات المراجعة على حقيبته
    execute 'drop policy if exists owner_select on public.reviews';
    execute 'create policy owner_select on public.reviews for select to authenticated using (
      exists (select 1 from public.training_bags b where b.id = reviews.bag_id and b.owner_id = auth.uid()))';
  end if;
end $$;

-- الملفات الشخصية: المدير ومديرة المشاريع يقرؤون الجميع، والمدير وحده يغيّر الأدوار
drop policy if exists mgr_select on public.profiles;
create policy mgr_select on public.profiles for select to authenticated using (public.is_manager());

drop policy if exists admin_update on public.profiles;
create policy admin_update on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

------------------------------------------------------------------
-- 4) حماية: لا يغيّر الدور إلا المدير، ولا يعتمد الحقيبة أو يعيدها للتعديل إلا الإدارة
--    (auth.uid() = null يعني تنفيذ مباشر من لوحة Supabase أو service role، فيُسمح به)
------------------------------------------------------------------
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'تغيير الدور مسموح للمدير فقط';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role before update on public.profiles
for each row execute function public.guard_profile_role();

create or replace function public.guard_bag_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_manager() then
    if tg_op = 'INSERT' and new.status::text in ('approved','needs_revision') then
      raise exception 'الاعتماد وإعادة التعديل من صلاحيات الإدارة فقط';
    end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status
       and new.status::text in ('approved','needs_revision') then
      raise exception 'الاعتماد وإعادة التعديل من صلاحيات الإدارة فقط';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_bag_status on public.training_bags;
create trigger trg_guard_bag_status before insert or update on public.training_bags
for each row execute function public.guard_bag_status();

------------------------------------------------------------------
-- 5) التخزين: صور المخرجات ومرفقات الحقيبة (خاص، بالتوقيع المؤقت)
--    مسار الملف: <bag_id>/<اسم الملف>
------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bag-files', 'bag-files', false)
on conflict (id) do nothing;

drop policy if exists bag_files_select on storage.objects;
create policy bag_files_select on storage.objects for select to authenticated
using (
  bucket_id = 'bag-files' and (
    public.is_manager()
    or exists (select 1 from public.training_bags b
               where b.id::text = (storage.foldername(name))[1] and b.owner_id = auth.uid())
  )
);

drop policy if exists bag_files_insert on storage.objects;
create policy bag_files_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'bag-files' and (
    public.is_manager()
    or exists (select 1 from public.training_bags b
               where b.id::text = (storage.foldername(name))[1] and b.owner_id = auth.uid())
  )
);

drop policy if exists bag_files_update on storage.objects;
create policy bag_files_update on storage.objects for update to authenticated
using (
  bucket_id = 'bag-files' and (
    public.is_manager()
    or exists (select 1 from public.training_bags b
               where b.id::text = (storage.foldername(name))[1] and b.owner_id = auth.uid())
  )
);

drop policy if exists bag_files_delete on storage.objects;
create policy bag_files_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'bag-files' and (
    public.is_admin()
    or exists (select 1 from public.training_bags b
               where b.id::text = (storage.foldername(name))[1] and b.owner_id = auth.uid())
  )
);
