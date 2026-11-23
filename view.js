/* =====================================================================
   view.js: عرض الحقيبة كاملة على الموقع (قراءة فقط) + قرار المراجعة + المستخدمون
   ثلاثة مستندات: بطاقة الحقيبة / المحتوى العلمي / دليل الطالب
   ===================================================================== */
let viewData=null,viewTab='card';

/* ---------- مساعدات HTML ---------- */
const nl=t=>esc(t).replace(/\n/g,'<br>');
const DASH='<span class="muted">—</span>';
const cell=x=>x&&typeof x==='object'&&'html' in x?x.html:(x===null||x===undefined||x===''?DASH:nl(x));
const kvTable=rows=>`<table class="doc-table kv"><tbody>${rows.map(([k,x])=>`<tr><th>${esc(k)}</th><td>${cell(x)}</td></tr>`).join('')}</tbody></table>`;
const gridTable=(head,rows,empty='لا توجد بيانات.')=>rows.length?`<div class="table-wrap"><table class="doc-table"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${cell(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<p class="muted">${empty}</p>`;
const imgs=list=>(list&&list.length)?`<div class="doc-imgs">${list.map(im=>`<figure><img data-spath="${esc(im.path)}" alt="${esc(im.name)}"><figcaption>${esc(im.name)}</figcaption></figure>`).join('')}</div>`:'';
const sec=(title,body)=>`<section class="doc-sec"><h3>${esc(title)}</h3>${body}</section>`;
const numbered=list=>list.length?list.map((o,i)=>`${i+1}. ${o.text}`).join('\n'):'';
const outName=(m,no)=>{const o=m.outputs.find(x=>String(x.output_no)===String(no));return `${no}${o?.name?' - '+o.name:''}`};
const objNums=d=>(d.objective_ids||[]).map(x=>Number(x)+1).sort((a,b)=>a-b).join('، ');
const dateText=d=>d?new Intl.DateTimeFormat('ar-SA',{dateStyle:'long'}).format(new Date(d)):'';

function approvalsTable(m){
  const a=m.extras.approvals||{};
  return gridTable(['الإجراء','الاسم','التاريخ','التوقيع'],APPROVAL_ROWS.map(([k,l])=>[l,a[k]?.name,dateText(a[k]?.date),a[k]?.signature]));
}

/* ---------- المستند 1: بطاقة الحقيبة ---------- */
function docCard(m){
  const pd=m.pd,ex=m.extras;
  const card=kvTable([['اسم البرنامج التدريبي',m.name],['القسم',m.department],['وصف البرنامج التدريبي',pd.description],['نوع البرنامج',pd.program_type],['المجال الأساسي',pd.primary_field],['المجالات المساندة',(pd.supporting_fields||[]).join('، ')],['الأجهزة والبرامج',pd.devices_software],['أهداف البرنامج',numbered(m.objectives)],['المستوى',pd.level],['نوع التطبيق العملي',pd.practical_application_type],['المدة',`${pd.duration_days??'—'} يوم / ${pd.duration_hours??'—'} ساعة`],['الفئة العمرية',`${pd.age_min??'—'} - ${pd.age_max??'—'}`],['الفئة المستهدفة',pd.target_audience],['عدد المشاركين',pd.participant_count],['تقسيم المشاركين',pd.participant_split],['شروط الالتحاق',pd.admission_requirements],['مُعدّ المحتوى العلمي',pd.scientific_content_author],['رقم الإصدار وتاريخ التحديث',pd.version],['تكلفة المستهلكات',pd.consumables_cost],['تكلفة تأسيسية غير متكررة',pd.setup_cost],['اعتبارات أخرى',pd.other_considerations]]);
  const outputs=gridTable(['رقم المخرج','اسم المخرج','النوع','الوصف المختصر','العدد','الملكية'],m.outputs.map(o=>[o.output_no,o.name,o.output_type,o.description,o.quantity,o.ownership]),'لم تضف مخرجات.');
  const measure=gridTable(['رقم واسم المخرج','ما الذي سنقيسه؟','النتيجة المطلوبة','كيف نثبت تحققها؟'],m.outputs.map(o=>[outName(m,o.output_no),o.measurement?.what_to_measure,o.measurement?.required_result,o.measurement?.verification_method]),'لا توجد بيانات قياس.');
  const refImgs=m.outputs.map(o=>{const l=ex.output_images?.[o.output_no];return l?.length?`<div class="img-group"><b>المخرج ${esc(outName(m,o.output_no))}</b>${imgs(l)}</div>`:''}).join('');
  const plan=gridTable(['رقم اليوم','ماذا سنتعلم اليوم؟','المحاور','الأهداف المرتبطة','المخرجات المرتبطة','التنفيذ والمدة','التحقق'],m.days.map(d=>[d.day_no,d.what_to_learn,d.topics,objNums(d),(d.output_ids||[]).join('، '),d.execution_duration,d.verification]),'لم تضف أيام تنفيذ.');
  const human=gridTable(['المورد البشري','العدد','الخبرة أو الشروط المطلوبة','المهام'],m.human.map(h=>[h.resource_type,h.quantity,h.requirements,h.responsibilities]),'لم تضف موارد بشرية.');
  const material=gridTable(['الاحتياج','المواصفات','الوحدة','الكمية للفرد/المجموعة','الكمية الإجمالية','ملاحظات'],m.material.map(x=>[x.item,x.specifications,x.unit,x.quantity_per_person_group,x.total_quantity,x.notes]),'لم تضف احتياجات.');
  const ready=gridTable(['بند الجاهزية','ما يجب تجهيزه أو التحقق منه','المدة اللازمة قبل التنفيذ','جاهز','ملاحظات'],m.readiness.map(r=>[r.category,r.preparation_requirements,r.lead_time,r.is_ready?'✓':'',r.notes]));
  const att=gridTable(['المرفق','ما يجب أن يتضمنه','الملف'],attachmentDefs.map(d=>{const a=ex.attachments?.[d[0]];return [d[1],d[2],a?{html:`<a href="#" data-open="${esc(a.path)}">${esc(a.name)}</a>`}:'']}),'');
  const check=`<ul class="checks">${CHECKLIST.map((t,i)=>`<li class="${ex.checklist?.[i]?'on':''}">${ex.checklist?.[i]?'☑':'☐'} ${esc(t)}</li>`).join('')}</ul>`;
  return sec('1. بطاقة البرنامج التدريبي',card)+sec('2. مخرجات البرنامج وتسليماته',outputs+'<h4>قياس تحقق المخرجات</h4>'+measure+(refImgs?'<h4>الصور المرجعية للمخرجات التقنية</h4>'+refImgs:''))+sec('3. خطة تنفيذ البرنامج',plan)+sec('4. الاحتياجات والموارد','<h4>الموارد البشرية</h4>'+human+'<h4>الاحتياجات المادية والتقنية</h4>'+material+'<h4>متطلبات الجاهزية قبل التنفيذ</h4>'+ready)+sec('5. مرفقات الحقيبة',att)+sec('المراجعة العلمية والاعتماد',approvalsTable(m))+sec('اكتمال الحقيبة',check);
}

/* ---------- المستند 2: المحتوى العلمي ---------- */
function docScientific(m){
  const pd=m.pd,s=m.extras.scientific||{};
  const info=kvTable([['اسم البرنامج التدريبي',m.name],['المستوى',pd.level],['الفئة العمرية',`${pd.age_min??'—'} - ${pd.age_max??'—'}`],['مدة البرنامج',`${pd.duration_days??'—'} يوم / ${pd.duration_hours??'—'} ساعة`],['إعداد المحتوى العلمي',pd.scientific_content_author],['رقم الإصدار وتاريخه',pd.version]]);
  const goals=m.objectives.length?`<ol class="goals">${m.objectives.map(o=>`<li>${nl(o.text)}</li>`).join('')}</ol>`:'<p class="muted">لم تضف أهدافاً.</p>';
  const days=m.days.map((d,i)=>{
    const x=(s.days||[])[i]||{};
    const linked=(d.output_ids||[]).map(n=>outName(m,n)).join('، ');
    return `<div class="day-block"><h4>اليوم التدريبي ${esc(d.day_no)}</h4>${kvTable([['مدة اليوم',d.execution_duration],['ماذا سنتعلم اليوم؟',d.what_to_learn],['الأهداف المرتبطة',objNums(d)],['المفاهيم والمصطلحات',x.concepts],['الشرح العلمي والتقني',x.explanation],['الأجهزة والبرامج والقطع المستخدمة',x.devices],['التطبيق العملي أو التحدي',x.practical],['خطوات التطبيق',x.steps],['نوع التنفيذ والزمن',x.exec_type],['المخرج المتوقع',x.expected_output||linked],['طريقة التحقق ومعيار القبول',x.acceptance||d.verification],['السلامة والأخطاء الشائعة',x.safety]])}${imgs(x.images)}</div>`}).join('')||'<p class="muted">لم تضف أيام تنفيذ.</p>';
  const r=s.reference_output||{};
  const ref=kvTable([['رقم واسم المخرج',r.output_no?outName(m,r.output_no):''],['وصف المخرج',r.description],['معايير القبول',r.acceptance],['ملفات المخرج',r.files]])+imgs(r.images);
  const refs=gridTable(['تاريخ الاطلاع','الرابط أو بيانات المرجع','المصدر'],(s.references||[]).map(x=>[dateText(x.date),x.link,x.source]),'لم تضف مراجع.');
  return sec('1. بيانات المحتوى',info+'<h4>أهداف التعلم</h4><p>بنهاية البرنامج يُتوقع أن يكون المشارك قادراً على:</p>'+goals)+sec('2. المحتوى العلمي حسب الأيام',days)+sec('3. المخرج التقني المرجعي',ref)+sec('4. المراجع والاعتماد','<h4>المراجع والمصادر</h4>'+refs+'<h4>مراجعة المحتوى واعتماده</h4>'+approvalsTable(m));
}

/* ---------- المستند 3: دليل الطالب ---------- */
function docGuide(m){
  const g=m.extras.student_guide||{},e=g.exec||{};
  const exec=kvTable([['اسم البرنامج التدريبي',m.name],['تاريخ البرنامج',e.dates],['أيام وساعات الحضور',e.attendance],['موقع التنفيذ والقاعة',e.venue],['رقم التواصل',e.contact],['رابط الموقع أو رمز الوصول',e.link]]);
  const intro=kvTable([['نبذة عن فاب لاب الأحساء',g.about_lab],['نبذة عن البرنامج',g.about_program],['أهداف البرنامج',numbered(m.objectives)]]);
  const makeLearn=gridTable(['سأنفذ أو أصنع','سأتعلم'],(g.make_learn||[]).map(x=>[x.make,x.learn]),'لم تضف صفوفاً.');
  const sd=m.extras.scientific?.days||[];
  const journey=gridTable(['اليوم','ماذا سأتعلم؟','ماذا سأطبق؟','مخرج اليوم'],m.days.map((d,i)=>[d.day_no,d.what_to_learn,sd[i]?.practical,(d.output_ids||[]).map(n=>outName(m,n)).join('، ')]),'لم تضف أيام تنفيذ.');
  const f=g.final_output||{};
  const fin=kvTable([['اسم المخرج',f.name],['وصفه',f.description]])+imgs(f.images);
  const sched=gridTable(['اليوم والتاريخ','وقت الحضور','وقت الانصراف'],(g.schedule||[]).map(x=>[x.day_date,x.from,x.to]),'لم تضف جلسات.');
  const ev=g.evaluation||{};
  const evalT=kvTable([['الاختبار القبلي والبعدي',ev.pre_post],['التطبيقات العملية',ev.practical],['المخرج النهائي',ev.final_output],['الحضور والشهادة',ev.attendance_cert]]);
  const bring=gridTable(['المتطلب','ملاحظة'],(g.bring||[]).map(x=>[x.requirement,x.note]),'لا يوجد.');
  const ins=kvTable(INSTRUCTIONS.map(([k,l])=>[l,(g.instructions||{})[k]]));
  const team=gridTable(['الدور','الاسم','وسيلة التواصل'],TEAM_ROLES.map(([k,l])=>[l,g.team?.[k]?.name,g.team?.[k]?.contact]));
  return sec('بيانات التنفيذ',exec)+sec('أهلاً بك',`<p>${cell(g.welcome)}</p>`)+sec('التعريف بالبرنامج',intro)+sec('ماذا ستتعلم وتصنع؟',makeLearn)+sec('رحلتي في البرنامج',journey)+sec('المخرج النهائي',fin)+sec('الجدول والتقييم','<h4>الجلسات والأنشطة</h4>'+sched+'<h4>كيف يتم تقييم مشاركتي؟</h4>'+evalT)+sec('ما الذي أحتاج إلى إحضاره؟',bring)+sec('تعليمات المشاركة والسلامة',ins)+sec('فريق البرنامج والتواصل',team+'<p class="muted small">لا تدرج أسماء المشاركين في دليل الطالب. تحفظ قوائمهم في كشف مستقل وفق ضوابط الخصوصية.</p>');
}

const DOC_TITLES={card:'قالب الحقيبة التدريبية',sci:'قالب المحتوى العلمي التدريبي',guide:'قالب دليل الطالب والطالبة'};
function renderViewBody(){
  if(!viewData)return;
  const m=viewData.model;
  const body={card:docCard,sci:docScientific,guide:docGuide}[viewTab](m);
  const c=$('viewBody');
  c.innerHTML=`<div class="doc-head"><span>فاب لاب الأحساء</span><h2>${esc(DOC_TITLES[viewTab])}</h2><p>${esc(m.name||'')}</p></div>${body}`;
  hydrateImages(c);
  document.querySelectorAll('.vtab').forEach(b=>b.classList.toggle('active',b.dataset.vtab===viewTab));
}
document.querySelectorAll('.vtab').forEach(b=>b.onclick=()=>{viewTab=b.dataset.vtab;renderViewBody()});

/* ---------- فتح صفحة العرض ---------- */
async function openView(id){
  setPage('view');viewTab='card';
  $('viewBody').innerHTML='<div class="empty">جاري التحميل...</div>';
  try{
    const f=await fetchBag(id);
    if(!isManager())ownerNames[currentUser.id]=$('userName').textContent;
    viewData={f,model:modelFromFetched(f)};
    const m=viewData.model;
    $('viewTitle').textContent=m.name||'الحقيبة';
    $('viewMeta').innerHTML=[m.owner?'الموظف: '+esc(m.owner):'',m.department?'القسم: '+esc(m.department):'','آخر تحديث: '+fmtDate(m.updated_at),`<span class="badge st-${esc(m.status)}">${esc(statusText(m.status))}</span>`].filter(Boolean).join(' · ');
    $('viewEdit').classList.toggle('hidden',!canEditBag(f.bag));
    setupReviewPanel();
    renderViewBody();
  }catch(e){$('viewBody').innerHTML=`<div class="empty">تعذر فتح الحقيبة: ${esc(e.message||e)}</div>`}
}
$('viewBack').onclick=()=>setPage('bags');
$('viewEdit').onclick=()=>viewData&&openBag(viewData.model.id);
$('viewPrint').onclick=()=>window.print();
$('viewExport').onclick=()=>viewData&&exportModel(viewData.model,{statusEl:null});
$('previewBag').onclick=async()=>{
  await saveBag({silent:true});
  if(!currentBagId)return toast('احفظ الحقيبة أولاً: اكتب اسم البرنامج واختر القسم','error');
  openView(currentBagId);
};

/* ---------- قرار المراجعة (مديرة المشاريع والمدير) ---------- */
function setupReviewPanel(){
  const p=$('reviewPanel');
  if(!isManager()||!viewData){p.classList.add('hidden');return}
  p.classList.remove('hidden');
  const d=viewData.model.extras.approvals?.decision,last=viewData.f.reviews?.[0],box=$('reviewLast');
  const comment=d?.comment||last?.comments;
  if(comment){box.classList.remove('hidden');box.innerHTML=`<b>آخر قرار:</b> ${esc(comment)}${d?.by?`<br><small>${esc(d.by)} · ${esc(d.date||'')}</small>`:''}`}else box.classList.add('hidden');
  $('decisionComment').value='';
}
async function decide(kind){
  if(!viewData||!isManager())return;
  const comment=$('decisionComment').value.trim();
  if(kind==='needs_revision'&&!comment)return toast('اكتب ملاحظات التعديل أولاً','error');
  const m=viewData.model,id=m.id;
  if(kind==='approved'&&m.status!=='submitted'&&!confirm('هذه الحقيبة لم تُرسل للمراجعة بعد. هل تريد اعتمادها؟'))return;
  const by=$('userName').textContent,date=new Date().toISOString().slice(0,10);
  $('approveBtn').disabled=$('needsRevisionBtn').disabled=true;
  try{
    await chk(db.from('training_bags').update({status:kind}).eq('id',id));
    const ap={...(m.extras.approvals||{}),decision:{status:kind,comment,by,date}};
    if(kind==='approved')['review','approve'].forEach(k=>{const r={...(ap[k]||{})};if(!r.name)r.name=by;if(!r.date)r.date=date;if(!r.signature)r.signature='معتمد إلكترونياً';ap[k]=r});
    const ex=await db.from('bag_extras').upsert({bag_id:id,approvals:ap,updated_at:new Date().toISOString()},{onConflict:'bag_id'});
    if(ex.error&&!/bag_extras/.test(ex.error.message||''))throw ex.error;
    // سجل المراجعة (اختياري: لا يمنع القرار إن فشل)
    await db.from('reviews').insert({bag_id:id,reviewer_id:currentUser.id,review_type:'general',status:kind,comments:comment,reviewed_at:new Date().toISOString()});
    toast(kind==='approved'?'تم اعتماد الحقيبة':'تمت إعادة الحقيبة للموظف مع الملاحظات');
    await loadBags();
    await openView(id);
  }catch(e){toast('تعذر حفظ القرار: '+(e.message||e),'error')}
  finally{$('approveBtn').disabled=$('needsRevisionBtn').disabled=false}
}
$('approveBtn').onclick=()=>decide('approved');
$('needsRevisionBtn').onclick=()=>decide('needs_revision');

/* ---------- المستخدمون (المدير فقط) ---------- */
async function loadUsers(){
  if(!isAdmin())return;
  const c=$('usersList');c.className='bag-list empty';c.textContent='جاري التحميل...';
  const {data,error}=await db.from('profiles').select('id,full_name,role').order('full_name');
  if(error){c.textContent='تعذر تحميل المستخدمين: '+error.message;return}
  if(!data?.length){c.textContent='لا يوجد مستخدمون.';return}
  c.className='bag-list';
  c.innerHTML=data.map(u=>`<div class="bag-row"><div class="bag-info"><strong>${esc(u.full_name||'بدون اسم')}</strong><span>${u.id===currentUser.id?'حسابك الحالي':''}</span></div><div class="bag-meta"><select data-uid="${esc(u.id)}"${u.id===currentUser.id?' disabled':''}>${Object.entries(ROLE_LABEL).map(([k,l])=>`<option value="${k}"${u.role===k?' selected':''}>${l}</option>`).join('')}</select></div></div>`).join('');
}
$('refreshUsers').onclick=loadUsers;
document.addEventListener('change',async e=>{
  const s=e.target.closest('[data-uid]');if(!s)return;
  s.disabled=true;
  const {error}=await db.from('profiles').update({role:s.value}).eq('id',s.dataset.uid);
  s.disabled=false;
  if(error){toast('تعذر تغيير الصلاحية: '+error.message,'error');loadUsers();return}
  toast('تم تغيير الصلاحية');
});
