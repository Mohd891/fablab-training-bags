/* =====================================================================
   نظام الحقائب التدريبية - فاب لاب الأحساء
   app.js: الإعدادات، الأدوار، تسجيل الدخول، قائمة الحقائب، المحرر والحفظ
   الملفات الأخرى: extras.js (المحتوى العلمي ودليل الطالب والصور والاعتماد)
                  view.js (عرض الحقيبة كاملة + قرار المراجعة + المستخدمون)
                  export.js (تصدير Excel)
   ===================================================================== */
const CONFIG={SUPABASE_URL:'https://kuuwmzqbzgzfetbpnlsl.supabase.co',SUPABASE_KEY:'sb_publishable_KLJ5ZpuhcXrGwnwTc7CFpw_Csqtd7UF'};
const ROLE_LABEL={admin:'المدير',project_manager:'مديرة المشاريع',staff:'موظف'};
const STATUS_LABEL={draft:'مسودة',in_progress:'مسودة',submitted:'قيد المراجعة',needs_revision:'تحتاج تعديلاً',approved:'معتمدة'};
const TEMPLATE_LIMITS={outputs:5,days:8,human:3,material:7};
const $=id=>document.getElementById(id);
let db=null,currentUser=null,currentRole='staff',currentBagId=null,currentBagStatus='draft';
let allBags=[],ownerNames={};
const state={objectives:[],outputs:[],days:[],human:[],material:[],readiness:[]};
let extras=blankExtras();

const attachmentDefs=[['pre_post','الاختبار القبلي والبعدي','الأسئلة والدرجات ومفاتيح الإجابة وما يقيسه كل سؤال وربطه بالأهداف.'],['scientific_content','المحتوى العلمي التدريبي','بيانات الإعداد والإصدار والأهداف والمحتوى حسب الأيام والتطبيقات والصور والمصادر والاعتماد.'],['presentation','العرض التقديمي','نسخة بصرية مختصرة ومتطابقة مع المحتوى العلمي وخطة التنفيذ.'],['technical_outputs','ملفات المخرجات التقنية','التصاميم والأكواد والتطبيقات وملفات التشغيل والتصنيع النهائية المجربة.'],['student_guide','دليل الطالب','التعريف بالبرنامج ورحلة المشارك والمخرجات والجدول والتقييم والتعليمات والسلامة.'],['reference_guide','الدليل العلمي المرجعي للطالب','ملخص أهم المفاهيم والأوامر والقطع وخطوات إعادة التطبيق.'],['assessment','نموذج تقييم التطبيقات والمخرجات','معايير تقييم التطبيقات وعمل المخرج وجودته وسلامته ومطابقته.'],['satisfaction','استبانة رضا المستفيد','النموذج المستخدم لقياس رضا المشاركين عن المحتوى والمدرب والتنظيم والتجربة.']];
const readinessDefs=['مكان التدريب','الأجهزة والأدوات','البرامج والحسابات','المواد والمستهلكات','الملفات الرقمية','المخرج النموذجي','السلامة','البدائل'];

/* ---------- أدوات عامة ---------- */
function toast(m,type='ok'){const e=$('toast');e.textContent=m;e.className='toast show '+type;setTimeout(()=>e.className='toast',type==='error'?4200:2600)}
function authMsg(m,error=false){$('authMessage').textContent=m;$('authMessage').style.color=error?'#c04b4b':'#4f7b5c'}
function esc(v=''){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function val(id){return $(id).value.trim()}
function numberVal(id){const v=$(id).value;return v===''?null:Number(v)}
const isManager=()=>currentRole==='admin'||currentRole==='project_manager';
const isAdmin=()=>currentRole==='admin';
const canUseEditor=()=>currentRole==='staff'||currentRole==='admin';
const deptName=id=>(window.departments||[]).find(d=>d.id===id)?.name||'';
const fmtDate=d=>d?new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(d)):'';
async function chk(p){const r=await p;if(r.error)throw r.error;return r}

function blankExtras(){return{scientific:{days:[],reference_output:{images:[]},references:[]},student_guide:{exec:{},make_learn:[],final_output:{images:[]},schedule:[],evaluation:{},bring:[],instructions:{},team:{}},checklist:[],approvals:{},output_images:{},attachments:{},staff_notes:''}}
function mergeExtras(row){const b=blankExtras();if(!row)return b;return{scientific:{...b.scientific,...(row.scientific||{})},student_guide:{...b.student_guide,...(row.student_guide||{})},checklist:Array.isArray(row.checklist)?row.checklist:[],approvals:row.approvals||{},output_images:row.output_images||{},attachments:row.attachments||{},staff_notes:row.staff_notes||''}}

/* ---------- الأدوار والتنقل ---------- */
function applyRole(){
  document.body.dataset.role=currentRole;
  document.querySelectorAll('[data-roles]').forEach(e=>e.classList.toggle('hidden',!e.dataset.roles.split(' ').includes(currentRole)));
  $('userRole').textContent=ROLE_LABEL[currentRole]||'';
  const mgr=isManager();
  $('navBags').textContent=mgr?'كل الحقائب':'حقائبي';
  $('bagsHeading').textContent=mgr?'كل الحقائب':'حقائبي';
  $('bagsSub').textContent=mgr?'جميع حقائب الموظفين. افتح أي حقيبة لعرضها كاملة ومراجعتها.':'يمكنك فتح أي حقيبة والمتابعة من آخر قسم وصلت إليه.';
  $('topEyebrow').textContent=currentRole==='admin'?'لوحة المدير':currentRole==='project_manager'?'لوحة مديرة المشاريع':'نظام إدارة المحتوى التدريبي';
  $('heroTitle').textContent=mgr?'متابعة الحقائب التدريبية':'خلّ إنجاز الحقيبة أسهل من Excel';
  $('heroText').textContent=mgr?'راجع الحقائب المرسلة، اطّلع على كل التفاصيل في صفحة واحدة، ثم اعتمدها أو أعدها للموظف مع ملاحظاتك.':'قسّم العمل إلى خطوات واضحة، احفظ كل تعديل، وتابع نسبة الإنجاز حتى تكتمل الحقيبة.';
}
const PAGE_ROLES={editor:['staff','admin'],users:['admin']};
function pageTitle(p){return {dashboard:'الرئيسية',bags:isManager()?'كل الحقائب':'حقائبي',editor:'محرر الحقيبة',view:'عرض الحقيبة',users:'المستخدمون'}[p]||'الرئيسية'}
function setPage(page){
  if(PAGE_ROLES[page]&&!PAGE_ROLES[page].includes(currentRole))page='dashboard';
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  $('page-'+page).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  $('pageTitle').textContent=pageTitle(page);
  window.scrollTo(0,0);
  if(page==='bags'||page==='dashboard')loadBags();
  if(page==='users'&&window.loadUsers)loadUsers();
}

/* ---------- حالة المحرر ---------- */
function resetState(){state.objectives=[];state.outputs=[];state.days=[];state.human=[];state.material=[];state.readiness=readinessDefs.map(category=>({category,is_ready:false,lead_time:'',preparation_requirements:'',notes:''}));extras=blankExtras();renderAll()}
function blankOutput(no){return{output_no:no,name:'',output_type:'',description:'',quantity:'',ownership:'',measurement:{what_to_measure:'',required_result:'',verification_method:''}}}
function blankDay(no){return{day_no:no,what_to_learn:'',topics:'',objective_ids:[],output_ids:[],execution_duration:'',verification:''}}
function renderAll(){renderObjectives();renderOutputs();renderDays();renderHuman();renderMaterial();renderReadiness();if(window.renderExtras)renderExtras();updateProgress()}

function renderObjectives(){const c=$('objectivesList');c.innerHTML=state.objectives.length?state.objectives.map((o,i)=>`<div class="objective-row"><b>${i+1}</b><span>${esc(o.text)}</span><button type="button" class="danger" onclick="removeObjective(${i})">حذف</button></div>`).join(''):'<div class="empty">لم تضف أهدافاً بعد.</div>'}
window.removeObjective=i=>{
  state.objectives.splice(i,1);state.objectives.forEach((o,n)=>o.objective_no=n+1);
  // تحديث الأهداف المرتبطة في خطة التنفيذ بعد الحذف
  state.days.forEach(d=>{d.objective_ids=(d.objective_ids||[]).map(Number).filter(x=>x!==i).map(x=>String(x>i?x-1:x))});
  renderObjectives();renderDays();updateProgress()};
$('addObjective').onclick=()=>{const v=$('objectiveInput').value.trim();if(!v)return toast('اكتب الهدف أولاً','error');state.objectives.push({objective_no:state.objectives.length+1,text:v});$('objectiveInput').value='';renderObjectives();updateProgress()};

function renderOutputs(){const c=$('outputsList');c.innerHTML=state.outputs.map((o,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>المخرج ${i+1}</strong><button type="button" class="danger" onclick="removeOutput(${i})">حذف</button></div><div class="item-grid"><label>اسم المخرج<input value="${esc(o.name)}" onchange="outChange(${i},'name',this.value)"></label><label>النوع<input value="${esc(o.output_type)}" onchange="outChange(${i},'output_type',this.value)"></label><label>العدد<input type="number" min="0" value="${esc(o.quantity)}" onchange="outChange(${i},'quantity',this.value)"></label><label>الملكية<input value="${esc(o.ownership)}" onchange="outChange(${i},'ownership',this.value)"></label><label class="full">الوصف المختصر<textarea rows="2" onchange="outChange(${i},'description',this.value)">${esc(o.description)}</textarea></label><label>ما الذي سنقيسه؟<textarea rows="2" onchange="outMeasure(${i},'what_to_measure',this.value)">${esc(o.measurement.what_to_measure)}</textarea></label><label>النتيجة المطلوبة<textarea rows="2" onchange="outMeasure(${i},'required_result',this.value)">${esc(o.measurement.required_result)}</textarea></label><label class="full">كيف نثبت تحققها؟<textarea rows="2" onchange="outMeasure(${i},'verification_method',this.value)">${esc(o.measurement.verification_method)}</textarea></label>${window.imgField?imgField('output_images.'+o.output_no,'الصورة المرجعية للمخرج'):''}</div></div>`).join('')||'<div class="empty">أضف المخرجات التي سيخرج بها المشارك من البرنامج.</div>';if(window.hydrateImages)hydrateImages(c)}
window.outChange=(i,k,v)=>{state.outputs[i][k]=v;updateProgress()};window.outMeasure=(i,k,v)=>{state.outputs[i].measurement[k]=v;updateProgress()};
window.removeOutput=i=>{
  // الصور المرجعية مربوطة برقم المخرج، فنعيد ترقيمها بعد الحذف
  const imgs=state.outputs.map(o=>extras.output_images[o.output_no]||[]);imgs.splice(i,1);
  state.outputs.splice(i,1);state.outputs.forEach((o,n)=>o.output_no=n+1);
  extras.output_images={};state.outputs.forEach((o,n)=>{if(imgs[n]?.length)extras.output_images[o.output_no]=imgs[n]});
  state.days.forEach(d=>{d.output_ids=(d.output_ids||[]).map(Number).filter(x=>x!==i+1).map(x=>String(x>i+1?x-1:x))});
  renderOutputs();renderDays();updateProgress()};
$('addOutput').onclick=()=>{if(state.outputs.length>=TEMPLATE_LIMITS.outputs)return toast('القالب يسمح بخمسة مخرجات كحد أقصى','error');state.outputs.push(blankOutput(state.outputs.length+1));renderOutputs();updateProgress()};

function renderDays(){const c=$('daysList');c.innerHTML=state.days.map((d,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>اليوم ${d.day_no}</strong><button type="button" class="danger" onclick="removeDay(${i})">حذف</button></div><div class="item-grid"><label>ماذا سنتعلم اليوم؟<textarea rows="2" onchange="dayChange(${i},'what_to_learn',this.value)">${esc(d.what_to_learn)}</textarea></label><label>المحاور<textarea rows="2" onchange="dayChange(${i},'topics',this.value)">${esc(d.topics)}</textarea></label><label>التنفيذ والمدة<input value="${esc(d.execution_duration)}" onchange="dayChange(${i},'execution_duration',this.value)"></label><label>التحقق<input value="${esc(d.verification)}" onchange="dayChange(${i},'verification',this.value)"></label><label>الأهداف المرتبطة<select multiple onchange="multiDay(${i},'objective_ids',this)">${state.objectives.map((o,n)=>`<option value="${n}" ${(d.objective_ids||[]).map(String).includes(String(n))?'selected':''}>${n+1} - ${esc(o.text)}</option>`).join('')}</select></label><label>المخرجات المرتبطة<select multiple onchange="multiDay(${i},'output_ids',this)">${state.outputs.map(o=>`<option value="${o.output_no}" ${(d.output_ids||[]).map(String).includes(String(o.output_no))?'selected':''}>${o.output_no} - ${esc(o.name||'مخرج بدون اسم')}</option>`).join('')}</select></label></div></div>`).join('')||'<div class="empty">أضف أيام التنفيذ.</div>'}
window.dayChange=(i,k,v)=>{state.days[i][k]=v;updateProgress()};window.multiDay=(i,k,e)=>{state.days[i][k]=Array.from(e.selectedOptions).map(x=>x.value);updateProgress()};
window.removeDay=i=>{state.days.splice(i,1);state.days.forEach((d,n)=>d.day_no=n+1);if(extras.scientific.days)extras.scientific.days.splice(i,1);renderDays();updateProgress()};
$('addDay').onclick=()=>{if(state.days.length>=TEMPLATE_LIMITS.days)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.days} أيام كحد أقصى`,'error');state.days.push(blankDay(state.days.length+1));renderDays();updateProgress()};

function renderHuman(){const c=$('humanList');c.innerHTML=state.human.map((h,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>${esc(h.resource_type||'مورد بشري')}</strong><button type="button" class="danger" onclick="removeHuman(${i})">حذف</button></div><div class="item-grid"><label>المورد البشري<input value="${esc(h.resource_type)}" onchange="humanChange(${i},'resource_type',this.value)"></label><label>العدد<input type="number" min="0" value="${esc(h.quantity??'')}" onchange="humanChange(${i},'quantity',this.value)"></label><label>الخبرة أو الشروط المطلوبة<textarea rows="2" onchange="humanChange(${i},'requirements',this.value)">${esc(h.requirements||'')}</textarea></label><label>المهام<textarea rows="2" onchange="humanChange(${i},'responsibilities',this.value)">${esc(h.responsibilities||'')}</textarea></label></div></div>`).join('')||'<div class="empty">أضف المدرب والمدرب المساعد والمتطوعين حسب الحاجة.</div>'}
window.humanChange=(i,k,v)=>{state.human[i][k]=v;updateProgress()};window.removeHuman=i=>{state.human.splice(i,1);renderHuman();updateProgress()};
$('addHuman').onclick=()=>{if(state.human.length>=TEMPLATE_LIMITS.human)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.human} موارد بشرية كحد أقصى`,'error');state.human.push({resource_type:'',quantity:'',requirements:'',responsibilities:''});renderHuman();updateProgress()};

function renderMaterial(){const c=$('materialList');c.innerHTML=state.material.map((m,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>${esc(m.item||'احتياج جديد')}</strong><button type="button" class="danger" onclick="removeMaterial(${i})">حذف</button></div><div class="item-grid"><label>الاحتياج<input value="${esc(m.item)}" onchange="materialChange(${i},'item',this.value)"></label><label>الوحدة<input value="${esc(m.unit||'')}" onchange="materialChange(${i},'unit',this.value)"></label><label>المواصفات<textarea rows="2" onchange="materialChange(${i},'specifications',this.value)">${esc(m.specifications||'')}</textarea></label><label>الكمية للفرد/المجموعة<input type="number" min="0" value="${esc(m.quantity_per_person_group??'')}" onchange="materialChange(${i},'quantity_per_person_group',this.value)"></label><label>الكمية الإجمالية<input type="number" min="0" value="${esc(m.total_quantity??'')}" onchange="materialChange(${i},'total_quantity',this.value)"></label><label>ملاحظات<textarea rows="2" onchange="materialChange(${i},'notes',this.value)">${esc(m.notes||'')}</textarea></label></div></div>`).join('')||'<div class="empty">أضف المواد والأجهزة والأدوات والبرامج والتراخيص.</div>'}
window.materialChange=(i,k,v)=>{state.material[i][k]=v;updateProgress()};window.removeMaterial=i=>{state.material.splice(i,1);renderMaterial();updateProgress()};
$('addMaterial').onclick=()=>{if(state.material.length>=TEMPLATE_LIMITS.material)return toast(`القالب يسمح بـ ${TEMPLATE_LIMITS.material} احتياجات كحد أقصى`,'error');state.material.push({item:'',unit:'',specifications:'',quantity_per_person_group:'',total_quantity:'',notes:''});renderMaterial();updateProgress()};

function renderReadiness(){const c=$('readinessList');c.innerHTML=state.readiness.map((r,i)=>`<div class="readiness-item"><div class="checkline"><input type="checkbox" ${r.is_ready?'checked':''} onchange="readyChange(${i},'is_ready',this.checked)"><strong>${esc(r.category)}</strong></div><label>ما يجب تجهيزه أو التحقق منه<textarea rows="2" onchange="readyChange(${i},'preparation_requirements',this.value)">${esc(r.preparation_requirements)}</textarea></label><label>المدة اللازمة قبل التنفيذ<input value="${esc(r.lead_time)}" onchange="readyChange(${i},'lead_time',this.value)"></label><label>ملاحظات<input value="${esc(r.notes)}" onchange="readyChange(${i},'notes',this.value)"></label></div>`).join('')}
window.readyChange=(i,k,v)=>{state.readiness[i][k]=v;updateProgress()};

/* ---------- بطاقة البرنامج ---------- */
function formData(){return{description:val('f_description'),program_type:val('f_program_type'),primary_field:val('f_primary_field'),supporting_fields:val('f_supporting_fields').split(',').map(x=>x.trim()).filter(Boolean),devices_software:val('f_devices_software'),level:val('f_level'),practical_application_type:val('f_practical'),duration_days:numberVal('f_days'),duration_hours:numberVal('f_hours'),age_min:numberVal('f_age_min'),age_max:numberVal('f_age_max'),target_audience:val('f_target'),participant_count:numberVal('f_participants'),participant_split:val('f_split'),admission_requirements:val('f_requirements'),scientific_content_author:val('f_author'),version:val('f_version'),last_updated_date:new Date().toISOString().slice(0,10),consumables_cost:numberVal('f_consumables'),setup_cost:numberVal('f_setup'),other_considerations:val('f_other')}}
function fillForm(d){const dep=$('f_department');if(dep)dep.value=d.department_id||localStorage.getItem('selectedDepartmentId')||'';const map={f_name:'name',f_description:'description',f_program_type:'program_type',f_primary_field:'primary_field',f_devices_software:'devices_software',f_level:'level',f_practical:'practical_application_type',f_target:'target_audience',f_split:'participant_split',f_requirements:'admission_requirements',f_author:'scientific_content_author',f_version:'version',f_days:'duration_days',f_hours:'duration_hours',f_age_min:'age_min',f_age_max:'age_max',f_participants:'participant_count',f_consumables:'consumables_cost',f_setup:'setup_cost',f_other:'other_considerations'};Object.entries(map).forEach(([id,k])=>$(id).value=d[k]??'');$('f_supporting_fields').value=Array.isArray(d.supporting_fields)?d.supporting_fields.join(', '):''}
function clearForm(){const dep=$('f_department');if(dep)dep.value=localStorage.getItem('selectedDepartmentId')||'';['f_name','f_description','f_program_type','f_primary_field','f_supporting_fields','f_devices_software','f_level','f_practical','f_target','f_split','f_requirements','f_author','f_version','f_days','f_hours','f_age_min','f_age_max','f_participants','f_consumables','f_setup','f_other','reviewComment'].forEach(id=>$(id).value='')}

/* حالة الحقيبة: الموظف يختار مسودة/إرسال للمراجعة فقط. الاعتماد وإعادة التعديل بقرار الإدارة */
function fillStatusSelect(current){
  const cur=!current||current==='in_progress'?'draft':current;
  const opts=[['draft','مسودة'],['submitted','إرسال للمراجعة']];
  if(isAdmin())opts.push(['needs_revision','تحتاج تعديلاً'],['approved','معتمدة']);
  else if(cur==='needs_revision'||cur==='approved')opts.push([cur,STATUS_LABEL[cur]+' (بقرار الإدارة)']);
  const sel=$('reviewStatus');
  sel.innerHTML=opts.map(([v,l])=>`<option value="${v}"${!isAdmin()&&(v==='needs_revision'||v==='approved')?' disabled':''}>${l}</option>`).join('');
  sel.value=cur;
}

function updateProgress(){
  let total=0,done=0;
  ['f_name','f_description','f_program_type','f_primary_field','f_devices_software','f_level','f_practical','f_days','f_hours','f_age_min','f_age_max','f_target','f_participants','f_author'].forEach(id=>{total++;if($(id).value.trim())done++});
  total+=3;if(state.objectives.length)done++;if(state.outputs.some(o=>o.name.trim()))done++;if(state.days.length)done++;
  total+=3;if(state.human.length)done++;if(state.material.length)done++;if(state.readiness.some(r=>r.is_ready||r.preparation_requirements.trim()))done++;
  total+=3;
  const sd=extras.scientific?.days||[];
  if(state.days.length&&state.days.every((_,i)=>(sd[i]?.explanation||'').trim()&&(sd[i]?.practical||'').trim()))done++;
  const g=extras.student_guide||{};
  if((g.welcome||'').trim()&&(g.about_program||'').trim()&&(g.final_output?.name||'').trim())done++;
  if((extras.checklist||[]).filter(Boolean).length>=6)done++;
  const pct=Math.round(done/total*100);
  $('editorProgress').textContent=pct+'%';$('progressFill').style.width=pct+'%';
}
document.addEventListener('input',e=>{if(e.target.closest('#page-editor'))updateProgress()});

/* ---------- تسجيل الدخول ---------- */
function setupAuth(){
  const form=$('authForm');
  form.onsubmit=async e=>{
    e.preventDefault();
    const email=$('email').value.trim().toLowerCase(),password=$('password').value;
    if(!email||!password){authMsg('أدخل البريد الإلكتروني وكلمة المرور.',true);return}
    $('authSubmit').disabled=true;authMsg('جاري تسجيل الدخول...');
    const {data,error}=await db.auth.signInWithPassword({email,password});
    $('authSubmit').disabled=false;
    if(error){authMsg('تعذر تسجيل الدخول: '+error.message,true);return}
    localStorage.setItem('loginEmail',email);
    await boot(data.user);
  };
  $('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};
}
async function init(){db=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_KEY);const {data}=await db.auth.getSession();if(data.session)await boot(data.session.user)}
async function boot(user){
  currentUser=user;
  $('authView').classList.add('hidden');$('appView').classList.remove('hidden');
  $('userName').textContent=user.email||'المستخدم';
  await ensureProfile(user);
  applyRole();
  await loadDepartments();
  setPage('dashboard');
}
async function ensureProfile(user){
  const {data}=await db.from('profiles').select('full_name,role').eq('id',user.id).maybeSingle();
  if(data?.full_name)$('userName').textContent=data.full_name;
  if(data){currentRole=ROLE_LABEL[data.role]?data.role:'staff';return}
  const email=user.email||user.user_metadata?.email||localStorage.getItem('loginEmail')||'مستخدم';
  const {error}=await db.from('profiles').insert({id:user.id,full_name:email,role:'staff'});
  if(!error)$('userName').textContent=email;
  currentRole='staff';
}
async function loadDepartments(){const {data,error}=await db.from('departments').select('id,name').eq('is_active',true).order('name');if(error){console.error(error);return}window.departments=data||[];const dep=$('f_department');if(dep){dep.innerHTML='<option value="">اختر القسم</option>';window.departments.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.name;dep.appendChild(o)});const saved=localStorage.getItem('selectedDepartmentId');if(saved)dep.value=saved}}

/* ---------- قوائم الحقائب والرئيسية ---------- */
async function loadBags(){
  let q=db.from('training_bags').select('id,name,status,completion_percent,updated_at,department_id,owner_id').order('updated_at',{ascending:false});
  if(!isManager())q=q.eq('owner_id',currentUser.id);
  const {data,error}=await q;
  if(error){toast('تعذر تحميل الحقائب: '+error.message,'error');return}
  allBags=data||[];
  if(isManager()&&allBags.some(b=>!(b.owner_id in ownerNames))){const {data:ps}=await db.from('profiles').select('id,full_name');ownerNames=Object.fromEntries((ps||[]).map(p=>[p.id,p.full_name]))}
  renderDashboard();renderBagList();
}
function renderDashboard(){
  const b=allBags;
  $('bagCount').textContent=b.length;
  $('draftCount').textContent=b.filter(x=>x.status==='draft'||x.status==='in_progress').length;
  $('reviewCount').textContent=b.filter(x=>x.status==='submitted'||x.status==='needs_revision').length;
  $('doneCount').textContent=b.filter(x=>x.status==='approved').length;
  $('avgProgress').textContent=(b.length?Math.round(b.reduce((s,x)=>s+Number(x.completion_percent||0),0)/b.length):0)+'%';
  renderBags($('recentBags'),b.slice(0,5));
  if(isManager())renderBags($('pendingBags'),b.filter(x=>x.status==='submitted'),'لا توجد حقائب بانتظار المراجعة.');
}
function renderBagList(){
  let list=allBags;
  if(isManager()){
    const s=($('bagSearch').value||'').trim().toLowerCase(),st=$('bagStatusFilter').value;
    list=list.filter(b=>(!st||b.status===st||(st==='draft'&&b.status==='in_progress'))&&(!s||(b.name||'').toLowerCase().includes(s)||(ownerNames[b.owner_id]||'').toLowerCase().includes(s)));
  }
  renderBags($('allBags'),list);
}
$('bagSearch').oninput=renderBagList;$('bagStatusFilter').onchange=renderBagList;
const canEditBag=b=>isAdmin()||(currentRole==='staff'&&b.owner_id===currentUser.id&&b.status!=='approved');
function statusText(s){return STATUS_LABEL[s]||'مسودة'}
function renderBags(c,bags,emptyText='لا توجد حقائب حتى الآن.'){
  if(!bags.length){c.className='bag-list empty';c.textContent=emptyText;return}
  c.className='bag-list';
  c.innerHTML=bags.map(b=>{
    const meta=[isManager()&&ownerNames[b.owner_id]?'الموظف: '+esc(ownerNames[b.owner_id]):'',deptName(b.department_id)?'القسم: '+esc(deptName(b.department_id)):'','آخر تحديث: '+fmtDate(b.updated_at)].filter(Boolean).join(' · ');
    return `<div class="bag-row"><div class="bag-info"><strong>${esc(b.name||'بدون اسم')}</strong><span>${meta}</span></div><div class="bag-meta"><span class="badge st-${esc(b.status)}">${statusText(b.status)}</span><div><div class="progress-mini"><span style="width:${Math.min(100,Number(b.completion_percent||0))}%"></span></div><small>${Math.round(Number(b.completion_percent||0))}%</small></div><button class="secondary" onclick="openView('${b.id}')">عرض</button>${canEditBag(b)?`<button class="secondary" onclick="openBag('${b.id}')">تعديل</button>`:''}</div></div>`}).join('');
}

/* ---------- تحميل الحقيبة من قاعدة البيانات ---------- */
async function fetchBag(id){
  const {data:bag,error}=await db.from('training_bags').select('*').eq('id',id).single();
  if(error)throw error;
  const q=t=>db.from(t).select('*').eq('bag_id',id);
  const [pd,obj,out,days,human,mat,ready,ex,rev]=await Promise.all([q('program_details').maybeSingle(),q('objectives').order('objective_no'),q('outputs').order('output_no'),q('implementation_days').order('day_no'),q('human_resources'),q('material_resources'),q('readiness_items'),q('bag_extras').maybeSingle(),db.from('reviews').select('*').eq('bag_id',id).order('reviewed_at',{ascending:false}).limit(10)]);
  for(const r of [pd,obj,out,days,human,mat,ready])if(r.error)throw r.error;
  const outputs=out.data||[];
  let ms=[];
  if(outputs.length){const r=await db.from('output_measurements').select('*').in('output_id',outputs.map(o=>o.id));ms=r.data||[]}
  outputs.forEach(o=>{o.measurement={what_to_measure:'',required_result:'',verification_method:'',...(ms.find(m=>m.output_id===o.id)||{})}});
  const ids=a=>(a||[]).map(String);
  const daysRows=(days.data||[]).map(d=>({...d,objective_ids:ids(d.objective_ids),output_ids:ids(d.output_ids)}));
  const readiness=(ready.data||[]).slice().sort((a,b)=>readinessDefs.indexOf(a.category)-readinessDefs.indexOf(b.category));
  return {bag,pd:pd.data,objectives:obj.data||[],outputs,days:daysRows,human:human.data||[],material:mat.data||[],readiness,extras:ex.error?null:ex.data,reviews:rev.error?[]:(rev.data||[])};
}
function modelFromFetched(f){
  const d=f.pd||{};
  return {id:f.bag.id,name:f.bag.name,department:deptName(f.bag.department_id),status:f.bag.status,owner:ownerNames[f.bag.owner_id]||'',owner_id:f.bag.owner_id,updated_at:f.bag.updated_at,pd:{...d,supporting_fields:Array.isArray(d.supporting_fields)?d.supporting_fields:[]},objectives:f.objectives,outputs:f.outputs,days:f.days,human:f.human,material:f.material,readiness:f.readiness,extras:mergeExtras(f.extras)};
}
function modelFromEditor(){
  const dep=$('f_department');
  return {id:currentBagId,name:val('f_name'),department:dep?.value?dep.selectedOptions[0].text:'',status:$('reviewStatus').value,pd:formData(),objectives:state.objectives,outputs:state.outputs,days:state.days,human:state.human,material:state.material,readiness:state.readiness,extras};
}

async function newBag(){
  if(!canUseEditor())return;
  currentBagId=null;currentBagStatus='draft';clearForm();resetState();fillStatusSelect('draft');
  $('editorMode').textContent='حقيبة جديدة';$('editorTitle').textContent='بطاقة البرنامج التدريبي';$('editorSubtitle').textContent='يمكنك الحفظ والعودة لاحقاً بدون فقدان البيانات.';
  showSection('program');setPage('editor');
}
$('newBagTop').onclick=newBag;$('startBag').onclick=newBag;$('newBagList').onclick=newBag;
$('backToBags').onclick=()=>setPage('bags');
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
document.querySelectorAll('[data-page-jump]').forEach(b=>b.onclick=()=>setPage(b.dataset.pageJump));
function showSection(name){
  document.querySelectorAll('.section-tab').forEach(x=>x.classList.toggle('active',x.dataset.section===name));
  document.querySelectorAll('.editor-section').forEach(x=>x.classList.toggle('active',x.dataset.sectionPanel===name));
  if(['sci','guide','attachments'].includes(name)&&window.renderExtras)renderExtras();
}
document.querySelectorAll('.section-tab').forEach(b=>b.onclick=()=>showSection(b.dataset.section));

async function openBag(id){
  try{
    const f=await fetchBag(id);
    if(!(isAdmin()||(currentRole==='staff'&&f.bag.owner_id===currentUser.id&&f.bag.status!=='approved'))){toast('لا يمكنك تعديل هذه الحقيبة','error');return openView(id)}
    currentBagId=id;currentBagStatus=f.bag.status;
    clearForm();resetState();
    fillForm({...f.bag,...(f.pd||{})});
    state.objectives=f.objectives;state.outputs=f.outputs;state.days=f.days;state.human=f.human;state.material=f.material;
    if(f.readiness.length)state.readiness=f.readiness;
    extras=mergeExtras(f.extras);
    $('reviewComment').value=extras.staff_notes||'';
    fillStatusSelect(f.bag.status);
    renderAll();
    $('editorMode').textContent='تعديل حقيبة';$('editorTitle').textContent=f.bag.name;$('editorSubtitle').textContent='استكمل من آخر مكان وصلت إليه ثم احفظ.';
    showSection('program');setPage('editor');
  }catch(e){toast('تعذر فتح الحقيبة: '+(e.message||e),'error')}
}

/* ---------- الحفظ ---------- */
let saving=false,saveQueued=false,extrasWarned=false;
async function saveBag({silent=false}={}){
  if(!currentUser||!canUseEditor())return;
  if(saving){saveQueued=true;return}
  const say=silent?()=>{}:toast;
  saving=true;
  try{
    const name=val('f_name');
    if(!name)return say('اسم البرنامج مطلوب','error');
    if(!window.departments?.length)return say('لا يوجد قسم مضاف في النظام بعد','error');
    const departmentId=$('f_department')?.value;
    if(!departmentId)return say('اختر القسم أولاً','error');
    localStorage.setItem('selectedDepartmentId',departmentId);
    const status=$('reviewStatus').value||'draft';
    const payload={name,department_id:departmentId,status,completion_percent:parseInt($('editorProgress').textContent)||0};
    if(currentBagId){await chk(db.from('training_bags').update(payload).eq('id',currentBagId))}
    else{const r=await chk(db.from('training_bags').insert({...payload,owner_id:currentUser.id}).select('id').single());currentBagId=r.data.id}
    currentBagStatus=status;
    const id=currentBagId;

    const pd=formData();pd.bag_id=id;
    await chk(db.from('program_details').upsert(pd,{onConflict:'bag_id'}));

    await chk(db.from('objectives').delete().eq('bag_id',id));
    if(state.objectives.length)await chk(db.from('objectives').insert(state.objectives.map(o=>({bag_id:id,objective_no:o.objective_no,text:o.text}))));

    await chk(db.from('outputs').delete().eq('bag_id',id));
    if(state.outputs.length){
      const ins=await chk(db.from('outputs').insert(state.outputs.map(o=>({bag_id:id,output_no:o.output_no,name:o.name,output_type:o.output_type,description:o.description,quantity:o.quantity?Number(o.quantity):null,ownership:o.ownership}))).select());
      const rows=(ins.data||[]).slice().sort((a,b)=>a.output_no-b.output_no);
      if(rows.length){
        await chk(db.from('output_measurements').delete().in('output_id',rows.map(x=>x.id)));
        await chk(db.from('output_measurements').insert(rows.map(x=>{const m=state.outputs.find(o=>o.output_no===x.output_no)?.measurement||{};return{output_id:x.id,what_to_measure:m.what_to_measure||'',required_result:m.required_result||'',verification_method:m.verification_method||''}})));
      }
    }

    await chk(db.from('implementation_days').delete().eq('bag_id',id));
    if(state.days.length)await chk(db.from('implementation_days').insert(state.days.map(d=>({...d,bag_id:id}))));
    await chk(db.from('human_resources').delete().eq('bag_id',id));
    if(state.human.length)await chk(db.from('human_resources').insert(state.human.map(h=>({...h,bag_id:id,quantity:h.quantity===''||h.quantity==null?null:Number(h.quantity)}))));
    await chk(db.from('material_resources').delete().eq('bag_id',id));
    if(state.material.length)await chk(db.from('material_resources').insert(state.material.map(m=>({...m,bag_id:id,quantity_per_person_group:m.quantity_per_person_group===''||m.quantity_per_person_group==null?null:Number(m.quantity_per_person_group),total_quantity:m.total_quantity===''||m.total_quantity==null?null:Number(m.total_quantity)}))));
    await chk(db.from('readiness_items').delete().eq('bag_id',id));
    if(state.readiness.length)await chk(db.from('readiness_items').insert(state.readiness.map(r=>({...r,bag_id:id}))));

    // المحتوى العلمي ودليل الطالب والاعتماد والصور والمرفقات
    extras.staff_notes=$('reviewComment').value;
    const ex=await db.from('bag_extras').upsert({bag_id:id,scientific:extras.scientific,student_guide:extras.student_guide,checklist:extras.checklist,approvals:extras.approvals,output_images:extras.output_images,attachments:extras.attachments,staff_notes:extras.staff_notes||null,updated_at:new Date().toISOString()},{onConflict:'bag_id'});
    if(ex.error){
      if(/bag_extras/.test(ex.error.message||'')){if(!extrasWarned){extrasWarned=true;toast('لم تُحفظ بيانات المحتوى العلمي ودليل الطالب: يجب تطبيق تحديث قاعدة البيانات أولاً','error')}}
      else throw ex.error;
    }
    say('تم حفظ الحقيبة بنجاح');
    await loadBags();
    $('editorMode').textContent='تم الحفظ';
  }catch(e){say('تعذر الحفظ: '+(e.message||e),'error')}
  finally{saving=false;if(saveQueued){saveQueued=false;saveBag({silent:true})}}
}
$('saveBag').onclick=()=>saveBag();

/* حفظ تلقائي (بعد توقف الكتابة) */
let autoSaveTimer=null;
function scheduleAutoSave(){clearTimeout(autoSaveTimer);autoSaveTimer=setTimeout(()=>{if(!$('page-editor').classList.contains('hidden'))saveBag({silent:true})},900)}
['input','change'].forEach(type=>document.addEventListener(type,e=>{if(e.target.closest('#page-editor'))scheduleAutoSave()},true));
document.addEventListener('click',e=>{if(e.target.closest('#addObjective,#addOutput,#addDay,#addHuman,#addMaterial,.danger'))scheduleAutoSave()},true);
