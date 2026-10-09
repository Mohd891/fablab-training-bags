const CONFIG={SUPABASE_URL:'https://kuuwmzqbzgzfetbpnlsl.supabase.co',SUPABASE_KEY:'sb_publishable_KLJ5ZpuhcXrGwnwTc7CFpw_Csqtd7UF'};
const $=id=>document.getElementById(id);let db=null,currentUser=null,currentBagId=null,signUpMode=false;
const state={objectives:[],outputs:[],days:[],human:[],material:[],readiness:[],attachments:{}};
const attachmentDefs=[['pre_post','الاختبار القبلي والبعدي','الأسئلة والدرجات ومفاتيح الإجابة وما يقيسه كل سؤال وربطه بالأهداف.'],['scientific_content','المحتوى العلمي التدريبي','بيانات الإعداد والإصدار والأهداف والمحتوى حسب الأيام والتطبيقات والصور والمصادر والاعتماد.'],['presentation','العرض التقديمي','نسخة بصرية مختصرة ومتطابقة مع المحتوى العلمي وخطة التنفيذ.'],['technical_outputs','ملفات المخرجات التقنية','التصاميم والأكواد والتطبيقات وملفات التشغيل والتصنيع النهائية المجربة.'],['student_guide','دليل الطالب','التعريف بالبرنامج ورحلة المشارك والمخرجات والجدول والتقييم والتعليمات والسلامة.'],['reference_guide','الدليل العلمي المرجعي للطالب','ملخص أهم المفاهيم والأوامر والقطع وخطوات إعادة التطبيق.'],['assessment','نموذج تقييم التطبيقات والمخرجات','معايير تقييم التطبيقات وعمل المخرج وجودته وسلامته ومطابقته.'],['satisfaction','استبانة رضا المستفيد','النموذج المستخدم لقياس رضا المشاركين عن المحتوى والمدرب والتنظيم والتجربة.']];
const readinessDefs=['مكان التدريب','الأجهزة والأدوات','البرامج والحسابات','المواد والمستهلكات','الملفات الرقمية','المخرج النموذجي','السلامة','البدائل'];
function toast(m,type='ok'){const e=$('toast');e.textContent=m;e.className='toast show '+type;setTimeout(()=>e.className='toast',2600)}
function authMsg(m,error=false){$('authMessage').textContent=m;$('authMessage').style.color=error?'#c04b4b':'#4f7b5c'}
function esc(v=''){return String(v).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function setPage(page){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$('page-'+page).classList.remove('hidden');document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('pageTitle').textContent={dashboard:'الرئيسية',bags:'حقائبي',editor:'محرر الحقيبة',manager:'إدارة الحقائب'}[page]||'الرئيسية';if(page==='bags')loadBags();if(page==='manager')loadManagerBags()}
function resetState(){state.objectives=[];state.outputs=[];state.days=[];state.human=[];state.material=[];state.readiness=readinessDefs.map(category=>({category,is_ready:false,lead_time:'',preparation_requirements:'',notes:''}));state.attachments={};renderAll()}
function blankOutput(no){return{output_no:no,name:'',output_type:'',description:'',quantity:'',ownership:'',measurement:{what_to_measure:'',required_result:'',verification_method:''}}}
function blankDay(no){return{day_no:no,what_to_learn:'',topics:'',objective_ids:[],output_ids:[],execution_duration:'',verification:''}}
function renderAll(){renderObjectives();renderOutputs();renderDays();renderHuman();renderMaterial();renderReadiness();renderAttachments();updateProgress()}
function renderObjectives(){const c=$('objectivesList');c.innerHTML=state.objectives.length?state.objectives.map((o,i)=>`<div class="objective-row"><b>${i+1}</b><span>${esc(o.text)}</span><button type="button" class="danger" onclick="removeObjective(${i})">حذف</button></div>`).join(''):'<div class="empty">لم تضف أهدافاً بعد.</div>'}
window.removeObjective=i=>{state.objectives.splice(i,1);state.objectives.forEach((o,n)=>o.objective_no=n+1);renderObjectives();updateProgress()};
$('addObjective').onclick=()=>{const v=$('objectiveInput').value.trim();if(!v)return toast('اكتب الهدف أولاً','error');state.objectives.push({objective_no:state.objectives.length+1,text:v});$('objectiveInput').value='';renderObjectives();updateProgress()};
function renderOutputs(){const c=$('outputsList');c.innerHTML=state.outputs.map((o,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>المخرج ${i+1}</strong><button type="button" class="danger" onclick="removeOutput(${i})">حذف</button></div><div class="item-grid"><label>اسم المخرج<input value="${esc(o.name)}" onchange="outChange(${i},'name',this.value)"></label><label>النوع<input value="${esc(o.output_type)}" onchange="outChange(${i},'output_type',this.value)"></label><label>العدد<input type="number" min="0" value="${esc(o.quantity)}" onchange="outChange(${i},'quantity',this.value)"></label><label>الملكية<input value="${esc(o.ownership)}" onchange="outChange(${i},'ownership',this.value)"></label><label class="full">الوصف المختصر<textarea rows="2" onchange="outChange(${i},'description',this.value)">${esc(o.description)}</textarea></label><label>ما الذي سنقيسه؟<textarea rows="2" onchange="outMeasure(${i},'what_to_measure',this.value)">${esc(o.measurement.what_to_measure)}</textarea></label><label>النتيجة المطلوبة<textarea rows="2" onchange="outMeasure(${i},'required_result',this.value)">${esc(o.measurement.required_result)}</textarea></label><label class="full">كيف نثبت تحققها؟<textarea rows="2" onchange="outMeasure(${i},'verification_method',this.value)">${esc(o.measurement.verification_method)}</textarea></label></div></div>`).join('')||'<div class="empty">أضف المخرجات التي سيخرج بها المشارك من البرنامج.</div>'}
window.outChange=(i,k,v)=>{state.outputs[i][k]=v;updateProgress()};window.outMeasure=(i,k,v)=>{state.outputs[i].measurement[k]=v;updateProgress()};window.removeOutput=i=>{state.outputs.splice(i,1);state.outputs.forEach((o,n)=>o.output_no=n+1);renderOutputs();renderDays();updateProgress()};
$('addOutput').onclick=()=>{if(state.outputs.length>=TEMPLATE_LIMITS.outputs)return toast('القالب يسمح بخمسة مخرجات كحد أقصى','error');state.outputs.push(blankOutput(state.outputs.length+1));renderOutputs();updateProgress()};
function renderDays(){const c=$('daysList');c.innerHTML=state.days.map((d,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>اليوم ${d.day_no}</strong><button type="button" class="danger" onclick="removeDay(${i})">حذف</button></div><div class="item-grid"><label>ماذا سنتعلم اليوم؟<textarea rows="2" onchange="dayChange(${i},'what_to_learn',this.value)">${esc(d.what_to_learn)}</textarea></label><label>المحاور<textarea rows="2" onchange="dayChange(${i},'topics',this.value)">${esc(d.topics)}</textarea></label><label>التنفيذ والمدة<input value="${esc(d.execution_duration)}" onchange="dayChange(${i},'execution_duration',this.value)"></label><label>التحقق<input value="${esc(d.verification)}" onchange="dayChange(${i},'verification',this.value)"></label><label>الأهداف المرتبطة<select multiple onchange="multiDay(${i},'objective_ids',this)">${state.objectives.map((o,n)=>`<option value="${n}" ${d.objective_ids.includes(String(n))?'selected':''}>${n+1} - ${esc(o.text)}</option>`).join('')}</select></label><label>المخرجات المرتبطة<select multiple onchange="multiDay(${i},'output_ids',this)">${state.outputs.map((o,n)=>`<option value="${o.output_no}" ${d.output_ids.includes(String(o.output_no))?'selected':''}>${o.output_no} - ${esc(o.name||'مخرج بدون اسم')}</option>`).join('')}</select></label></div></div>`).join('')||'<div class="empty">أضف أيام التنفيذ.</div>'}
window.dayChange=(i,k,v)=>{state.days[i][k]=v;updateProgress()};window.multiDay=(i,k,e)=>{state.days[i][k]=Array.from(e.selectedOptions).map(x=>x.value);updateProgress()};window.removeDay=i=>{state.days.splice(i,1);state.days.forEach((d,n)=>d.day_no=n+1);renderDays();updateProgress()};$('addDay').onclick=()=>{if(state.days.length>=TEMPLATE_LIMITS.days)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.days} أيام كحد أقصى`,'error');state.days.push(blankDay(state.days.length+1));renderDays();updateProgress()};
function renderHuman(){const c=$('humanList');c.innerHTML=state.human.map((h,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>${esc(h.resource_type||'مورد بشري')}</strong><button type="button" class="danger" onclick="removeHuman(${i})">حذف</button></div><div class="item-grid"><label>المورد البشري<input value="${esc(h.resource_type)}" onchange="humanChange(${i},'resource_type',this.value)"></label><label>العدد<input type="number" min="0" value="${esc(h.quantity??'')}" onchange="humanChange(${i},'quantity',this.value)"></label><label>الخبرة أو الشروط المطلوبة<textarea rows="2" onchange="humanChange(${i},'requirements',this.value)">${esc(h.requirements||'')}</textarea></label><label>المهام<textarea rows="2" onchange="humanChange(${i},'responsibilities',this.value)">${esc(h.responsibilities||'')}</textarea></label></div></div>`).join('')||'<div class="empty">أضف المدرب والمدرب المساعد والمتطوعين حسب الحاجة.</div>'}
window.humanChange=(i,k,v)=>{state.human[i][k]=v;updateProgress()};window.removeHuman=i=>{state.human.splice(i,1);renderHuman();updateProgress()};$('addHuman').onclick=()=>{if(state.human.length>=TEMPLATE_LIMITS.human)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.human} موارد بشرية كحد أقصى`,'error');state.human.push({resource_type:'',quantity:'',requirements:'',responsibilities:''});renderHuman();updateProgress()};
function renderMaterial(){const c=$('materialList');c.innerHTML=state.material.map((m,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>${esc(m.item||'احتياج جديد')}</strong><button type="button" class="danger" onclick="removeMaterial(${i})">حذف</button></div><div class="item-grid"><label>الاحتياج<input value="${esc(m.item)}" onchange="materialChange(${i},'item',this.value)"></label><label>الوحدة<input value="${esc(m.unit||'')}" onchange="materialChange(${i},'unit',this.value)"></label><label>المواصفات<textarea rows="2" onchange="materialChange(${i},'specifications',this.value)">${esc(m.specifications||'')}</textarea></label><label>الكمية للفرد/المجموعة<input type="number" min="0" value="${esc(m.quantity_per_person_group??'')}" onchange="materialChange(${i},'quantity_per_person_group',this.value)"></label><label>الكمية الإجمالية<input type="number" min="0" value="${esc(m.total_quantity??'')}" onchange="materialChange(${i},'total_quantity',this.value)"></label><label>ملاحظات<textarea rows="2" onchange="materialChange(${i},'notes',this.value)">${esc(m.notes||'')}</textarea></label></div></div>`).join('')||'<div class="empty">أضف المواد والأجهزة والأدوات والبرامج والتراخيص.</div>'}
window.materialChange=(i,k,v)=>{state.material[i][k]=v;updateProgress()};window.removeMaterial=i=>{state.material.splice(i,1);renderMaterial();updateProgress()};$('addMaterial').onclick=()=>{if(state.material.length>=TEMPLATE_LIMITS.material)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.material} احتياجات كحد أقصى`,'error');state.material.push({item:'',unit:'',specifications:'',quantity_per_person_group:'',total_quantity:'',notes:''});renderMaterial();updateProgress()};
function renderReadiness(){const c=$('readinessList');c.innerHTML=state.readiness.map((r,i)=>`<div class="readiness-item"><div class="checkline"><input type="checkbox" ${r.is_ready?'checked':''} onchange="readyChange(${i},'is_ready',this.checked)"><strong>${esc(r.category)}</strong></div><label>ما يجب تجهيزه أو التحقق منه<textarea rows="2" onchange="readyChange(${i},'preparation_requirements',this.value)">${esc(r.preparation_requirements)}</textarea></label><label>المدة اللازمة قبل التنفيذ<input value="${esc(r.lead_time)}" onchange="readyChange(${i},'lead_time',this.value)"></label><label>ملاحظات<input value="${esc(r.notes)}" onchange="readyChange(${i},'notes',this.value)"></label></div>`).join('')}
window.readyChange=(i,k,v)=>{state.readiness[i][k]=v;updateProgress()};
function renderAttachments(){const c=$('attachmentList');c.innerHTML=attachmentDefs.map(d=>`<div class="attachment-card"><h4>${esc(d[1])}</h4><p>${esc(d[2])}</p><input type="file" data-attachment="${d[0]}" onchange="filePicked(this)"><div class="file-name">${esc(state.attachments[d[0]]?.name||'لم يتم اختيار ملف')}</div></div>`).join('')}
window.filePicked=input=>{const key=input.dataset.attachment;if(input.files[0])state.attachments[key]=input.files[0];renderAttachments();updateProgress()};
function val(id){return $(id).value.trim()};function numberVal(id){const v=$(id).value;return v===''?null:Number(v)}
function formData(){return{description:val('f_description'),program_type:val('f_program_type'),primary_field:val('f_primary_field'),supporting_fields:val('f_supporting_fields').split(',').map(x=>x.trim()).filter(Boolean),devices_software:val('f_devices_software'),level:val('f_level'),practical_application_type:val('f_practical'),duration_days:numberVal('f_days'),duration_hours:numberVal('f_hours'),age_min:numberVal('f_age_min'),age_max:numberVal('f_age_max'),target_audience:val('f_target'),participant_count:numberVal('f_participants'),participant_split:val('f_split'),admission_requirements:val('f_requirements'),scientific_content_author:val('f_author'),version:val('f_version'),last_updated_date:new Date().toISOString().slice(0,10),consumables_cost:numberVal('f_consumables'),setup_cost:numberVal('f_setup'),other_considerations:val('f_other')}}
function fillForm(d){const dep=$('f_department');if(dep)dep.value=d.department_id||localStorage.getItem('selectedDepartmentId')||'';const map={f_name:'name',f_description:'description',f_program_type:'program_type',f_primary_field:'primary_field',f_devices_software:'devices_software',f_level:'level',f_practical:'practical_application_type',f_target:'target_audience',f_split:'participant_split',f_requirements:'admission_requirements',f_author:'scientific_content_author',f_version:'version',f_days:'duration_days',f_hours:'duration_hours',f_age_min:'age_min',f_age_max:'age_max',f_participants:'participant_count',f_consumables:'consumables_cost',f_setup:'setup_cost',f_other:'other_considerations'};Object.entries(map).forEach(([id,k])=>$(id).value=d[k]??'');$('f_supporting_fields').value=Array.isArray(d.supporting_fields)?d.supporting_fields.join(', '):'';const statusMap={draft:'draft',in_progress:'draft',submitted:'review',needs_revision:'review',approved:'completed'};$('reviewStatus').value=statusMap[d.status]||'draft';$('reviewComment').value=d.review_comment||''}
function clearForm(){const dep=$('f_department');if(dep)dep.value=localStorage.getItem('selectedDepartmentId')||'';['f_name','f_description','f_program_type','f_primary_field','f_supporting_fields','f_devices_software','f_level','f_practical','f_target','f_split','f_requirements','f_author','f_version','f_days','f_hours','f_age_min','f_age_max','f_participants','f_consumables','f_setup','f_other','reviewComment'].forEach(id=>$(id).value='');$('reviewStatus').value='draft'}
function updateProgress(){let total=0,done=0;const req=['f_name','f_description','f_program_type','f_primary_field','f_devices_software','f_level','f_practical','f_days','f_hours','f_age_min','f_age_max','f_target','f_participants','f_author'];req.forEach(id=>{total++;if($(id).value.trim())done++});total+=3;if(state.objectives.length)done++;if(state.outputs.some(o=>o.name.trim()))done++;if(state.days.length)done++;total+=3;if(state.human.length)done++;if(state.material.length)done++;if(state.readiness.some(r=>r.is_ready||r.preparation_requirements.trim()))done++;const pct=Math.round(done/total*100);$('editorProgress').textContent=pct+'%';$('progressFill').style.width=pct+'%'}
document.addEventListener('input',e=>{if(e.target.closest('#page-editor'))updateProgress()});
function setupAuth(){
  const form=$("authForm");
  if(form){
    form.onsubmit=async e=>{
      e.preventDefault();
      const email=$("email")?.value.trim().toLowerCase()||"";
      const password=$("password")?.value||"";
      if(!email||!password){authMsg("أدخل البريد الإلكتروني وكلمة المرور.",true);return}
      $("authSubmit").disabled=true;
      authMsg("جاري تسجيل الدخول...");
      const {data,error}=await db.auth.signInWithPassword({email,password});
      $("authSubmit").disabled=false;
      if(error){authMsg(error.message,true);return}
      localStorage.setItem("loginEmail",email);
      await boot(data.user);
    };
  }
  const managerForm=$("managerAuthForm");
  if(managerForm){
    managerForm.onsubmit=async e=>{
      e.preventDefault();
      const email=$("managerEmail")?.value.trim().toLowerCase()||"";
      const password=$("managerPassword")?.value||"";
      if(!email||!password){authMsg("أدخل بيانات المدير.",true);return}
      const {data,error}=await db.auth.signInWithPassword({email,password});
      if(error){authMsg(error.message,true);return}
      const {data:profile}=await db.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
      if(profile?.role!=="project_manager"&&profile?.role!=="admin"){await db.auth.signOut();authMsg("هذا الحساب ليس حساب إدارة.",true);return}
      await boot(data.user);
    };
  }
  const managerToggle=$("managerLoginToggle");
  if(managerToggle){
    managerToggle.onclick=()=>{
      $("managerAuthForm")?.classList.toggle("hidden");
      $("authForm")?.classList.toggle("hidden");
    };
  }
}
async function init(){db=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_KEY);const {data}=await db.auth.getSession();if(data.session)await boot(data.session.user)}
$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};
async function boot(user){currentUser=user;$('authView').classList.add('hidden');$('appView').classList.remove('hidden');$('userName').textContent=user.email||'المستخدم';await ensureProfile(user);await loadDepartments();await loadBags();setPage('dashboard')}
async function ensureProfile(user){const {data}=await db.from('profiles').select('full_name,role').eq('id',user.id).maybeSingle();if(data?.full_name)$('userName').textContent=data.full_name;if(data?.role==='project_manager')document.querySelector('.manager-only').classList.remove('hidden');if(!data){const email=user.email||user.user_metadata?.email||localStorage.getItem('loginEmail')||'مستخدم';const {error}=await db.from('profiles').insert({id:user.id,full_name:email,role:'staff'});if(!error)$('userName').textContent=email}}
async function loadDepartments(){const {data,error}=await db.from('departments').select('id,name').eq('is_active',true).order('name');if(error){console.error(error);return}window.departments=data||[];const dep=$('f_department');if(dep){dep.innerHTML='<option value="">اختر القسم</option>';window.departments.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.name;dep.appendChild(o)});const saved=localStorage.getItem('selectedDepartmentId');if(saved)dep.value=saved}}
async function loadBags(){const {data,error}=await db.from('training_bags').select('id,name,status,completion_percent,updated_at,department_id').order('updated_at',{ascending:false});if(error)return;const bags=data||[];renderBags($('allBags'),bags);renderBags($('recentBags'),bags.slice(0,5));$('bagCount').textContent=bags.length;$('draftCount').textContent=bags.filter(b=>b.status==='draft'||b.status==='in_progress').length;$('reviewCount').textContent=bags.filter(b=>b.status==='submitted'||b.status==='needs_revision').length;$('doneCount').textContent=bags.filter(b=>b.status==='approved'||Number(b.completion_percent)>=100).length;$('avgProgress').textContent=(bags.length?Math.round(bags.reduce((s,b)=>s+Number(b.completion_percent||0),0)/bags.length):0)+'%'}
function renderBags(c,bags){if(!bags.length){c.className='bag-list empty';c.textContent='لا توجد حقائب حتى الآن.';return}c.className='bag-list';c.innerHTML=bags.map(b=>`<div class="bag-row"><div class="bag-info"><strong>${esc(b.name)}</strong><span>آخر تحديث: ${new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(b.updated_at))}</span></div><div class="bag-meta"><span class="badge">${statusText(b.status)}</span><div><div class="progress-mini"><span style="width:${Math.min(100,Number(b.completion_percent||0))}%"></span></div><small>${Math.round(Number(b.completion_percent||0))}%</small></div><button class="secondary" onclick="openBag('${b.id}')">فتح</button></div></div>`).join('')}
async function loadManagerBags(){const {data,error}=await db.from('training_bags').select('id,name,status,completion_percent,updated_at').order('updated_at',{ascending:false});if(error)return $('managerBags').textContent='تعذر تحميل الحقائب.';renderBags($('managerBags'),data||[])}
function statusText(s){return s==='submitted'?'قيد المراجعة':s==='needs_revision'?'تحتاج تعديلاً':s==='approved'?'مكتملة':'مسودة'}
async function newBag(){currentBagId=null;clearForm();resetState();$('editorMode').textContent='حقيبة جديدة';$('editorTitle').textContent='بطاقة البرنامج التدريبي';$('editorSubtitle').textContent='يمكنك الحفظ والعودة لاحقاً بدون فقدان البيانات.';setPage('editor')}
$('newBagTop').onclick=newBag;$('startBag').onclick=newBag;$('newBagList').onclick=newBag;$('backToBags').onclick=()=>setPage('bags');
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>setPage(b.dataset.page));document.querySelectorAll('[data-page-jump]').forEach(b=>b.onclick=()=>setPage(b.dataset.pageJump));
document.querySelectorAll('.section-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.section-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.editor-section').forEach(x=>x.classList.remove('active'));document.querySelector(`[data-section-panel="${b.dataset.section}"]`).classList.add('active')});
async function openBag(id){const {data:bag,error}=await db.from('training_bags').select('*').eq('id',id).single();if(error)return toast('تعذر فتح الحقيبة','error');currentBagId=id;clearForm();resetState();const {data:pd}=await db.from('program_details').select('*').eq('bag_id',id).maybeSingle();fillForm({...bag,...(pd||{})});const [{data:obj},{data:out},{data:days},{data:human},{data:mat},{data:ready}]=await Promise.all([db.from('objectives').select('*').eq('bag_id',id).order('objective_no'),db.from('outputs').select('*').eq('bag_id',id).order('output_no'),db.from('implementation_days').select('*').eq('bag_id',id).order('day_no'),db.from('human_resources').select('*').eq('bag_id',id),db.from('material_resources').select('*').eq('bag_id',id),db.from('readiness_items').select('*').eq('bag_id',id)]);state.objectives=obj||[];state.outputs=(out||[]).map(o=>({...o,measurement:{what_to_measure:'',required_result:'',verification_method:''}}));for(const o of state.outputs){const {data:m}=await db.from('output_measurements').select('*').eq('output_id',o.id).maybeSingle();if(m)o.measurement=m}state.days=days||[];state.human=human||[];state.material=mat||[];state.readiness=ready?.length?ready:state.readiness;renderAll();$('editorMode').textContent='تعديل حقيبة';$('editorTitle').textContent=bag.name;$('editorSubtitle').textContent='استكمل من آخر مكان وصلت إليه ثم احفظ.';setPage('editor')}
let saving=false,saveQueued=false;
async function saveBag({silent=false}={}){if(!currentUser)return;if(saving){saveQueued=true;return}const toast=silent?()=>{}:window.toast;saving=true;try{const name=val('f_name');if(!name)return toast('اسم البرنامج مطلوب','error');if(!window.departments?.length){return toast('لا يوجد قسم مضاف في النظام بعد','error')}const departmentId=$('f_department')?.value;if(!departmentId)return toast('اختر القسم أولاً','error');localStorage.setItem('selectedDepartmentId',departmentId);const bagStatusMap={draft:'draft',review:'submitted',completed:'approved'};let payload={name,department_id:departmentId,owner_id:currentUser.id,status:bagStatusMap[$('reviewStatus').value]||'draft',completion_percent:parseInt($('editorProgress').textContent)||0};if(currentBagId){const {error}=await db.from('training_bags').update(payload).eq('id',currentBagId);if(error)return toast(error.message,'error')}else{const {data,error}=await db.from('training_bags').insert(payload).select('id').single();if(error)return toast(error.message,'error');currentBagId=data.id}
const pd=formData();pd.bag_id=currentBagId;await db.from('program_details').upsert(pd,{onConflict:'bag_id'});await db.from('objectives').delete().eq('bag_id',currentBagId);if(state.objectives.length)await db.from('objectives').insert(state.objectives.map(o=>({bag_id:currentBagId,objective_no:o.objective_no,text:o.text})));await db.from('outputs').delete().eq('bag_id',currentBagId);if(state.outputs.length){const ins=await db.from('outputs').insert(state.outputs.map(o=>({bag_id:currentBagId,output_no:o.output_no,name:o.name,output_type:o.output_type,description:o.description,quantity:o.quantity?Number(o.quantity):null,ownership:o.ownership}))).select();if(ins.data){await db.from('output_measurements').delete().in('output_id',ins.data.map(x=>x.id));const ms=ins.data.map((x,i)=>({output_id:x.id,...state.outputs[i].measurement}));if(ms.length)await db.from('output_measurements').insert(ms)}}await db.from('implementation_days').delete().eq('bag_id',currentBagId);if(state.days.length)await db.from('implementation_days').insert(state.days.map(d=>({...d,bag_id:currentBagId})));await db.from('human_resources').delete().eq('bag_id',currentBagId);if(state.human.length)await db.from('human_resources').insert(state.human.map(h=>({...h,bag_id:currentBagId,quantity:h.quantity===''?null:Number(h.quantity)})));await db.from('material_resources').delete().eq('bag_id',currentBagId);if(state.material.length)await db.from('material_resources').insert(state.material.map(m=>({...m,bag_id:currentBagId,quantity_per_person_group:m.quantity_per_person_group===''?null:Number(m.quantity_per_person_group),total_quantity:m.total_quantity===''?null:Number(m.total_quantity)})));await db.from('readiness_items').delete().eq('bag_id',currentBagId);if(state.readiness.length)await db.from('readiness_items').insert(state.readiness.map(r=>({...r,bag_id:currentBagId})));const reviewMap={draft:'draft',review:'submitted',completed:'approved'};const reviewStatus=reviewMap[$('reviewStatus').value]||'draft';await db.from('reviews').insert({bag_id:currentBagId,reviewer_id:currentUser.id,review_type:'general',status:reviewStatus,comments:$('reviewComment').value,reviewed_at:new Date().toISOString()});toast('تم حفظ الحقيبة بنجاح');await loadBags();$('editorMode').textContent='تم الحفظ';}finally{saving=false;if(saveQueued){saveQueued=false;saveBag({silent:true})}}}
$('saveBag').onclick=()=>saveBag();
/* ---------- Excel export (fills the official template, keeps its formatting) ---------- */
const TEMPLATE_URL='assets/training-bag-template.xlsx?v=20261009';
const TEMPLATE_SHEET='قالب الحقيبة';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TEMPLATE_LIMITS={outputs:5,days:8,human:3,material:7};
const FIELD_CELLS={name:'A6',description:'A7',program_type:'A8',primary_field:'A9',devices_software:'A11',level:'A13',practical_application_type:'A14',target_audience:'A17',participant_count:'A18',participant_split:'A19',admission_requirements:'A20',scientific_content_author:'A21',version:'A22',consumables_cost:'A23',setup_cost:'A24',other_considerations:'A25'};
const ATTACHMENT_FIRST_ROW=90;
async function loadTemplate(){
  const res=await fetch(TEMPLATE_URL,{cache:'no-store'});
  const type=(res.headers.get('content-type')||'').toLowerCase();
  if(!res.ok||type.includes('text/html'))throw new Error('تعذر تحميل قالب Excel الأصلي. لم يتم إنشاء ملف بديل.');
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  return wb;
}
function fillTemplate(ws){
  const num=v=>v===''||v===null||v===undefined?undefined:Number(v);
  const set=(addr,v)=>{if(v!==null&&v!==undefined&&v!=='')ws.getCell(addr).value=v};
  const row=(r,cols)=>Object.entries(cols).forEach(([col,v])=>set(col+r,v));
  const pd={name:val('f_name'),...formData()};
  const lineCount=text=>String(text).split('\n').length;
  set('A5',$('f_department')?.selectedOptions?.[0]?.text);
  Object.entries(FIELD_CELLS).forEach(([key,addr])=>set(addr,pd[key]));
  set('A10',pd.supporting_fields.join(', '));
  const objectives=state.objectives.map((o,i)=>`${i+1}. ${o.text}`).join('\n');
  set('A12',objectives);
  if(objectives)ws.getRow(12).height=Math.max(ws.getRow(12).height||0,lineCount(objectives)*18);
  set('A15',`${pd.duration_days??''} يوم / ${pd.duration_hours??''} ساعة`);
  set('A16',`${pd.age_min??''} - ${pd.age_max??''}`);
  state.outputs.slice(0,TEMPLATE_LIMITS.outputs).forEach((o,i)=>{
    const m=o.measurement||{};
    row(30+i,{F:o.output_no,E:o.name,D:o.output_type,C:o.description,B:num(o.quantity),A:o.ownership});
    row(38+i,{D:`${o.output_no} - ${o.name}`,C:m.what_to_measure,B:m.required_result,A:m.verification_method});
  });
  state.days.slice(0,TEMPLATE_LIMITS.days).forEach((d,i)=>row(53+i,{G:d.day_no,F:d.what_to_learn,E:d.topics,D:d.objective_ids.map(x=>Number(x)+1).join(', '),C:d.output_ids.join(', '),B:d.execution_duration,A:d.verification}));
  state.human.slice(0,TEMPLATE_LIMITS.human).forEach((h,i)=>row(65+i,{D:h.resource_type,C:num(h.quantity),B:h.requirements,A:h.responsibilities}));
  state.material.slice(0,TEMPLATE_LIMITS.material).forEach((m,i)=>row(70+i,{F:m.item,E:m.specifications,D:m.unit,C:num(m.quantity_per_person_group),B:num(m.total_quantity),A:m.notes}));
  state.readiness.forEach((r,i)=>row(79+i,{C:r.category,B:r.preparation_requirements,A:r.lead_time}));
  attachmentDefs.forEach(([key],i)=>set('A'+(ATTACHMENT_FIRST_ROW+i),state.attachments[key]?.name));
}
async function exportExcel(){
  if(!currentBagId)return toast('احفظ الحقيبة أولاً','error');
  const status=$('exportStatus');status.textContent='جاري تجهيز ملف Excel...';
  try{
    const wb=await loadTemplate();
    const ws=wb.getWorksheet(TEMPLATE_SHEET);
    if(!ws)throw new Error('ورقة قالب الحقيبة غير موجودة.');
    fillTemplate(ws);
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:XLSX_MIME});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(val('f_name')||'الحقيبة التدريبية').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)+'.xlsx';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    const over=Object.keys(TEMPLATE_LIMITS).filter(k=>state[k].length>TEMPLATE_LIMITS[k]);
    status.textContent=over.length?'تم التجهيز، لكن بعض الصفوف تجاوزت حدود القالب ولم تُصدَّر.':'تم تجهيز ملف Excel بالقالب الأصلي.';
  }catch(e){status.textContent='تعذر التصدير: '+e.message;toast('تعذر التصدير: '+e.message,'error')}
}
$('exportExcel').onclick=exportExcel;

/* ---------- Auto-save (debounced, silent) ---------- */
let autoSaveTimer=null;
function scheduleAutoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>{if(!$('page-editor').classList.contains('hidden'))saveBag({silent:true})},900);
}
['input','change'].forEach(type=>document.addEventListener(type,e=>{if(e.target.closest('#page-editor'))scheduleAutoSave()},true));
document.addEventListener('click',e=>{if(e.target.closest('#addObjective,#addOutput,#addDay,#addHuman,#addMaterial,.danger'))scheduleAutoSave()},true);

setupAuth();init();