/* =====================================================================
   extras.js: أقسام المحرر الإضافية (المحتوى العلمي ودليل الطالب)
   + الصور والمرفقات (Supabase Storage) + قائمة الاكتمال + الاعتماد
   كل الحقول تُحفظ في extras (جدول bag_extras) عبر خاصية data-path
   ===================================================================== */
const CHECKLIST=['جميع الحقول الأساسية مكتملة','المخرجات موصوفة وصورها مرفقة','خطة الأيام مرتبطة بالأهداف والمخرجات','الاحتياجات محسوبة حسب عدد المشاركين','جميع الملفات مرفقة ومجربة','يمكن لمدرب متخصص تنفيذ البرنامج من الحقيبة مباشرة'];
const APPROVAL_ROWS=[['prep','إعداد المحتوى',false],['review','المراجعة العلمية والتقنية',true],['approve','اعتماد الحقيبة',true]];
const INSTRUCTIONS=[['attendance','الحضور والانصراف'],['conduct','التعامل والعمل الجماعي'],['devices','استخدام الأجهزة والبرامج'],['property','المحافظة على الأدوات والممتلكات'],['privacy','التصوير والخصوصية'],['safety','السلامة داخل القاعة'],['emergency','الحالات الطارئة']];
const TEAM_ROLES=[['trainer','المدرب'],['assistant','المدرب المساعد'],['officer','مسؤول البرنامج'],['support','الدعم التقني/الإداري']];
const BUCKET='bag-files';

/* ---------- مسارات البيانات ---------- */
function getPath(obj,path){return path.split('.').reduce((o,k)=>o==null?undefined:o[k],obj)}
function setPath(obj,path,value){
  const keys=path.split('.');let o=obj;
  keys.slice(0,-1).forEach((k,i)=>{if(o[k]==null||typeof o[k]!=='object')o[k]=/^\d+$/.test(keys[i+1])?[]:{};o=o[k]});
  o[keys[keys.length-1]]=value;
}

/* ---------- مولّدات الحقول ---------- */
function fld(path,label,{type='text',rows=2,full=false,ph='',opts=null,hint='',disabled=false}={}){
  const v=getPath(extras,path)??'';
  const dis=disabled?' disabled':'';
  let ctl;
  if(opts)ctl=`<select data-path="${esc(path)}"${dis}><option value="">اختر</option>${opts.map(o=>{const [ov,ol]=Array.isArray(o)?o:[o,o];return `<option value="${esc(ov)}"${String(ov)===String(v)?' selected':''}>${esc(ol)}</option>`}).join('')}</select>`;
  else if(type==='area')ctl=`<textarea rows="${rows}" data-path="${esc(path)}" placeholder="${esc(ph)}"${dis}>${esc(v)}</textarea>`;
  else ctl=`<input type="${type}" data-path="${esc(path)}" value="${esc(v)}" placeholder="${esc(ph)}"${dis}>`;
  return `<label class="${full?'full':''}">${esc(label)}${hint?`<span class="hint">${esc(hint)}</span>`:''}${ctl}</label>`;
}
function repeater(path,cols,{max=8,addLabel='+ إضافة صف',emptyText='لا توجد صفوف بعد.'}={}){
  const arr=getPath(extras,path)||[];
  const rows=arr.map((_,i)=>`<div class="repeat-item"><div class="repeat-item-head"><strong>${i+1}</strong><button type="button" class="danger" data-del="${esc(path)}:${i}">حذف</button></div><div class="item-grid">${cols.map(c=>fld(`${path}.${i}.${c.key}`,c.label,{type:c.type,full:c.full,rows:c.rows})).join('')}</div></div>`).join('');
  return `<div class="full"><div class="repeat-list">${rows||`<div class="empty">${emptyText}</div>`}</div>${arr.length<max?`<button type="button" class="secondary add-row" data-add="${esc(path)}" data-max="${max}">${addLabel}</button>`:''}</div>`;
}
function imgField(path,label,{multiple=true}={}){
  const arr=getPath(extras,path)||[];
  return `<div class="full img-field"><span class="lbl">${esc(label)}</span><div class="thumbs">${arr.map((im,i)=>`<figure><img data-spath="${esc(im.path)}" alt="${esc(im.name)}"><figcaption>${esc(im.name)}</figcaption><button type="button" class="danger" data-imgdel="${esc(path)}:${i}">حذف</button></figure>`).join('')}</div><input type="file" accept="image/*"${multiple?' multiple':''} data-imgup="${esc(path)}"></div>`;
}
const sub=t=>`<h4 class="sub full">${esc(t)}</h4>`;

/* ---------- Supabase Storage ---------- */
const urlCache=new Map();
async function signedUrls(paths){
  const now=Date.now(),need=[...new Set(paths)].filter(p=>!(urlCache.get(p)?.exp>now));
  if(need.length){
    const {data}=await db.storage.from(BUCKET).createSignedUrls(need,3600);
    (data||[]).forEach(r=>{if(r.signedUrl)urlCache.set(r.path,{url:r.signedUrl,exp:now+3000*1000})});
  }
  return p=>urlCache.get(p)?.url||'';
}
async function hydrateImages(root){
  const imgs=[...root.querySelectorAll('img[data-spath]')];if(!imgs.length)return;
  try{const get=await signedUrls(imgs.map(i=>i.dataset.spath));imgs.forEach(i=>{const u=get(i.dataset.spath);if(u)i.src=u})}catch(e){console.error(e)}
}
async function openStored(path){try{const get=await signedUrls([path]);const u=get(path);if(!u)throw new Error('تعذر فتح الملف');window.open(u,'_blank','noopener')}catch(e){toast(e.message||'تعذر فتح الملف','error')}}
async function uploadFile(file,{maxMB=20}={}){
  if(!currentBagId){await saveBag();if(!currentBagId)throw new Error('احفظ الحقيبة أولاً: اكتب اسم البرنامج واختر القسم')}
  if(file.size>maxMB*1024*1024)throw new Error(`حجم الملف أكبر من ${maxMB} ميغا`);
  const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8)||'bin';
  const path=`${currentBagId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const {error}=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(error)throw error;
  return {path,name:file.name};
}
const removeStored=path=>{db.storage.from(BUCKET).remove([path]).catch(()=>{})};

/* ---------- المحتوى العلمي ---------- */
function syncSciDays(){
  const s=extras.scientific;if(!Array.isArray(s.days))s.days=[];
  while(s.days.length<state.days.length)s.days.push({images:[]});
}
function renderSci(){
  const root=$('sciRoot');if(!root)return;
  syncSciDays();
  const outOpts=state.outputs.map(o=>[String(o.output_no),`${o.output_no} - ${o.name||'مخرج بدون اسم'}`]);
  const days=state.days.map((d,i)=>{
    const p=`scientific.days.${i}.`;
    const objs=(d.objective_ids||[]).map(x=>Number(x)+1).sort((a,b)=>a-b).join('، ')||'—';
    const outs=(d.output_ids||[]).map(n=>{const o=state.outputs.find(x=>String(x.output_no)===String(n));return `${n}${o?.name?' - '+o.name:''}`}).join('، ')||'—';
    return `<div class="repeat-item"><div class="repeat-item-head"><strong>اليوم التدريبي ${d.day_no}</strong></div>
<div class="notice"><b>من خطة التنفيذ:</b> ماذا سنتعلم: ${esc(d.what_to_learn)||'—'} · المدة: ${esc(d.execution_duration)||'—'} · الأهداف المرتبطة: ${esc(objs)} · المخرجات: ${esc(outs)}</div>
<div class="item-grid">
${fld(p+'concepts','المفاهيم والمصطلحات',{type:'area',full:true})}
${fld(p+'explanation','الشرح العلمي والتقني',{type:'area',rows:4,full:true})}
${fld(p+'devices','الأجهزة والبرامج والقطع المستخدمة',{type:'area',full:true})}
${fld(p+'practical','التطبيق العملي أو التحدي',{type:'area',full:true})}
${fld(p+'steps','خطوات التطبيق',{type:'area',rows:4,full:true,hint:'اكتب كل خطوة في سطر'})}
${fld(p+'exec_type','نوع التنفيذ والزمن',{ph:'فردي / جماعي - 45 دقيقة'})}
${fld(p+'expected_output','المخرج المتوقع',{ph:'يؤخذ من المخرجات المرتبطة إذا تُرك فارغاً'})}
${fld(p+'acceptance','طريقة التحقق ومعيار القبول',{type:'area',full:true,ph:'يؤخذ من خانة «التحقق» في خطة التنفيذ إذا تُرك فارغاً'})}
${fld(p+'safety','السلامة والأخطاء الشائعة',{type:'area',full:true})}
${imgField(p+'images','الصور أو الرسومات التوضيحية')}
</div></div>`}).join('')||'<div class="empty">أضف أيام التنفيذ في «خطة التنفيذ» أولاً، وسيظهر هنا محتوى كل يوم.</div>';
  root.innerHTML=`<h4 class="sub">المحتوى العلمي حسب الأيام</h4><div class="repeat-list">${days}</div>
<hr><h4 class="sub">المخرج التقني المرجعي</h4><div class="form-grid">
${fld('scientific.reference_output.output_no','رقم واسم المخرج',{opts:outOpts})}
${fld('scientific.reference_output.files','ملفات المخرج',{ph:'ملفات التصميم أو الأكواد أو التطبيق أو التشغيل المرفقة'})}
${fld('scientific.reference_output.description','وصف المخرج',{type:'area',full:true,hint:'شكله ووظيفته وما الذي يجب أن ينفذه المشارك'})}
${fld('scientific.reference_output.acceptance','معايير القبول',{type:'area',full:true,hint:'اكتماله وجودته وعمله وسلامته'})}
${imgField('scientific.reference_output.images','الصورة المرجعية للمخرج')}
</div>
<hr><h4 class="sub">المراجع والمصادر</h4><div class="form-grid">${repeater('scientific.references',[{key:'date',label:'تاريخ الاطلاع',type:'date'},{key:'link',label:'الرابط أو بيانات المرجع'},{key:'source',label:'المصدر',full:true}],{max:8,addLabel:'+ إضافة مرجع',emptyText:'لم تضف مراجع بعد.'})}</div>`;
  hydrateImages(root);
}

/* ---------- دليل الطالب ---------- */
function renderGuide(){
  const root=$('guideRoot');if(!root)return;
  const g='student_guide.';
  root.innerHTML=`<h4 class="sub">بيانات التنفيذ</h4><div class="form-grid">
${fld(g+'exec.dates','تاريخ البرنامج',{ph:'من ... إلى ...'})}
${fld(g+'exec.attendance','أيام وساعات الحضور',{ph:'الأحد - الخميس · 4:00 - 7:00 م'})}
${fld(g+'exec.venue','موقع التنفيذ والقاعة')}
${fld(g+'exec.contact','رقم التواصل',{type:'tel'})}
${fld(g+'exec.link','رابط الموقع أو رمز الوصول',{full:true})}
</div>
<hr><h4 class="sub">أهلاً بك</h4><div class="form-grid">${fld(g+'welcome','رسالة الترحيب',{type:'area',rows:3,full:true,hint:'رسالة قصيرة توضح للمشارك طبيعة التجربة وما الذي ينتظره'})}</div>
<hr><h4 class="sub">التعريف بالبرنامج</h4><div class="form-grid">
${fld(g+'about_lab','نبذة عن فاب لاب الأحساء',{type:'area',rows:3,full:true,hint:'تعريف مختصر بالمعمل ودوره في التصنيع الرقمي والابتكار'})}
${fld(g+'about_program','نبذة عن البرنامج',{type:'area',rows:3,full:true,hint:'فكرة البرنامج ومدته ومجاله بأسلوب مناسب للمشارك'})}
<div class="full notice">أهداف البرنامج تُسحب تلقائياً من «بطاقة البرنامج».</div></div>
<hr><h4 class="sub">ماذا ستتعلم وتصنع؟</h4><div class="form-grid">${repeater(g+'make_learn',[{key:'make',label:'سأنفذ أو أصنع',type:'area'},{key:'learn',label:'سأتعلم',type:'area'}],{max:6,addLabel:'+ إضافة صف'})}</div>
<hr><h4 class="sub">رحلتي في البرنامج</h4><div class="notice">تُبنى تلقائياً من خطة التنفيذ والمحتوى العلمي: لكل يوم ماذا سأتعلم، وماذا سأطبق، ومخرج اليوم.</div>
<hr><h4 class="sub">المخرج النهائي</h4><div class="form-grid">
${fld(g+'final_output.name','اسم المخرج')}
${fld(g+'final_output.description','وصفه',{type:'area',full:true,hint:'ماذا يفعل؟ وما الذي سينفذه المشارك بنفسه؟'})}
${imgField(g+'final_output.images','صورة المخرج المرجعي',{multiple:false})}
</div>
<hr><h4 class="sub">الجدول</h4><div class="form-grid">${repeater(g+'schedule',[{key:'day_date',label:'اليوم والتاريخ'},{key:'from',label:'وقت الحضور',type:'time'},{key:'to',label:'وقت الانصراف',type:'time'}],{max:8,addLabel:'+ إضافة جلسة',emptyText:'لم تضف جلسات بعد.'})}<div class="full"><button type="button" class="secondary" data-act="schedule-prefill">تعبئة الجلسات من أيام البرنامج</button></div></div>
<hr><h4 class="sub">كيف يتم تقييم مشاركتي؟</h4><div class="form-grid">
${fld(g+'evaluation.pre_post','الاختبار القبلي والبعدي',{type:'area',full:true,hint:'الهدف منهما وموعدهما وطريقة تنفيذهما'})}
${fld(g+'evaluation.practical','التطبيقات العملية',{type:'area',full:true,hint:'كيف تتم متابعة إنجاز التطبيقات اليومية'})}
${fld(g+'evaluation.final_output','المخرج النهائي',{type:'area',full:true,hint:'معايير قبول المخرج العملي'})}
${fld(g+'evaluation.attendance_cert','الحضور والشهادة',{type:'area',full:true,hint:'نسبة الحضور ومتطلبات الحصول على الشهادة'})}
</div>
<hr><h4 class="sub">ما الذي أحتاج إلى إحضاره؟</h4><div class="form-grid">${repeater(g+'bring',[{key:'requirement',label:'المتطلب'},{key:'note',label:'ملاحظة'}],{max:6,addLabel:'+ إضافة متطلب'})}</div>
<hr><h4 class="sub">تعليمات المشاركة والسلامة</h4><div class="form-grid">${INSTRUCTIONS.map(([k,l])=>fld(g+'instructions.'+k,l,{type:'area',full:true})).join('')}</div>
<hr><h4 class="sub">فريق البرنامج والتواصل</h4><div class="notice">لا تدرج أسماء المشاركين في دليل الطالب. تحفظ قوائمهم في كشف مستقل وفق ضوابط الخصوصية.</div><div class="form-grid">${TEAM_ROLES.map(([k,l])=>fld(g+`team.${k}.name`,l+' - الاسم')+fld(g+`team.${k}.contact`,l+' - وسيلة التواصل')).join('')}</div>`;
  hydrateImages(root);
}

/* ---------- المرفقات وقائمة الاكتمال والاعتماد ---------- */
function renderAttachments(){
  const c=$('attachmentList');if(!c)return;
  c.innerHTML=attachmentDefs.map(d=>{const a=extras.attachments[d[0]];
    return `<div class="attachment-card"><h4>${esc(d[1])}</h4><p>${esc(d[2])}</p><input type="file" data-attup="${d[0]}"><div class="file-name">${a?`<a href="#" data-open="${esc(a.path)}">${esc(a.name)}</a> · <a href="#" class="danger-link" data-attdel="${d[0]}">حذف</a>`:'لم يتم اختيار ملف'}</div></div>`}).join('');
}
function renderChecklist(){
  const c=$('checklistRoot');if(!c)return;
  c.innerHTML=CHECKLIST.map((t,i)=>`<label class="check-item"><input type="checkbox" data-check="${i}"${extras.checklist[i]?' checked':''}><span>${esc(t)}</span></label>`).join('');
}
function renderApprovals(){
  const c=$('approvalsRoot');if(!c)return;
  c.innerHTML=APPROVAL_ROWS.map(([k,l,mgrOnly])=>{
    const dis=mgrOnly&&!isManager();
    return `<div class="repeat-item"><div class="repeat-item-head"><strong>${esc(l)}</strong>${dis?'<span class="hint">تعبئها الإدارة</span>':''}</div><div class="item-grid">${fld(`approvals.${k}.name`,'الاسم',{disabled:dis})}${fld(`approvals.${k}.date`,'التاريخ',{type:'date',disabled:dis})}${fld(`approvals.${k}.signature`,'التوقيع',{disabled:dis})}</div></div>`}).join('');
  const d=extras.approvals?.decision,box=$('lastDecision');
  if(box){if(d&&d.comment){box.classList.remove('hidden');box.innerHTML=`<b>آخر قرار للمراجعة (${esc(STATUS_LABEL[d.status]||d.status)}):</b> ${esc(d.comment)}${d.by?`<br><small>${esc(d.by)} · ${esc(d.date||'')}</small>`:''}`}else box.classList.add('hidden')}
}
function renderExtras(){syncSciDays();renderSci();renderGuide();renderAttachments();renderChecklist();renderApprovals()}

/* ---------- الأحداث ---------- */
function onDataPath(e){
  const t=e.target.closest('[data-path]');if(!t||!t.closest('#page-editor'))return;
  setPath(extras,t.dataset.path,t.value);
  if(typeof updateProgress==='function')updateProgress();
}
document.addEventListener('input',onDataPath);
document.addEventListener('change',async e=>{
  onDataPath(e);
  const ck=e.target.closest('[data-check]');
  if(ck){extras.checklist[Number(ck.dataset.check)]=ck.checked;for(let i=0;i<CHECKLIST.length;i++)extras.checklist[i]=!!extras.checklist[i];updateProgress();return}
  const iu=e.target.closest('[data-imgup]');
  if(iu){
    const path=iu.dataset.imgup,files=[...iu.files];iu.value='';
    if(!files.length)return;
    toast('جاري رفع الصورة...');
    try{
      const arr=getPath(extras,path)||[];
      for(const f of files){
        if(!f.type.startsWith('image/'))throw new Error('اختر ملف صورة فقط');
        arr.push(await uploadFile(f,{maxMB:8}));
      }
      setPath(extras,path,arr);renderAll();scheduleAutoSave();toast('تم رفع الصورة');
    }catch(err){toast(err.message||'تعذر رفع الصورة','error')}
    return;
  }
  const au=e.target.closest('[data-attup]');
  if(au){
    const f=au.files[0];au.value='';if(!f)return;
    toast('جاري رفع الملف...');
    try{
      const old=extras.attachments[au.dataset.attup];
      extras.attachments[au.dataset.attup]=await uploadFile(f,{maxMB:20});
      if(old)removeStored(old.path);
      renderAttachments();scheduleAutoSave();toast('تم رفع الملف');
    }catch(err){toast(err.message||'تعذر رفع الملف','error')}
  }
});
document.addEventListener('click',e=>{
  const open=e.target.closest('[data-open]');
  if(open){e.preventDefault();openStored(open.dataset.open);return}
  const ad=e.target.closest('[data-attdel]');
  if(ad){e.preventDefault();const a=extras.attachments[ad.dataset.attdel];if(a)removeStored(a.path);delete extras.attachments[ad.dataset.attdel];renderAttachments();scheduleAutoSave();return}
  const id=e.target.closest('[data-imgdel]');
  if(id){const [path,i]=splitLast(id.dataset.imgdel);const arr=getPath(extras,path)||[];const [r]=arr.splice(Number(i),1);if(r)removeStored(r.path);renderAll();scheduleAutoSave();return}
  const add=e.target.closest('[data-add]');
  if(add){const path=add.dataset.add;const arr=getPath(extras,path)||[];if(arr.length<Number(add.dataset.max||20))arr.push({});setPath(extras,path,arr);renderExtras();scheduleAutoSave();return}
  const del=e.target.closest('[data-del]');
  if(del){const [path,i]=splitLast(del.dataset.del);const arr=getPath(extras,path)||[];arr.splice(Number(i),1);renderExtras();scheduleAutoSave();return}
  const act=e.target.closest('[data-act="schedule-prefill"]');
  if(act){const arr=getPath(extras,'student_guide.schedule')||[];for(let n=arr.length;n<Math.min(state.days.length,8);n++)arr.push({day_date:'اليوم '+(n+1),from:'',to:''});setPath(extras,'student_guide.schedule',arr);renderGuide();scheduleAutoSave()}
});
function splitLast(s){const k=s.lastIndexOf(':');return [s.slice(0,k),s.slice(k+1)]}
