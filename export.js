/* =====================================================================
   export.js: التصدير إلى قالب Excel المعتمد (قالب الحقيبة) مع الحفاظ على تنسيقه
   يعمل من المحرر (بيانات الشاشة) ومن صفحة العرض (بيانات محفوظة) بنفس النموذج m
   ===================================================================== */
const TEMPLATE_URL='assets/training-bag-template.xlsx?v=20261123';
const TEMPLATE_SHEET='قالب الحقيبة';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FIELD_CELLS={name:'A6',description:'A7',program_type:'A8',primary_field:'A9',devices_software:'A11',level:'A13',practical_application_type:'A14',target_audience:'A17',participant_count:'A18',participant_split:'A19',admission_requirements:'A20',scientific_content_author:'A21',version:'A22',consumables_cost:'A23',setup_cost:'A24',other_considerations:'A25'};
const ATTACHMENT_FIRST_ROW=90;
const IMAGE_FIRST_ROW=46,IMAGE_ROWS=3; // صفوف «الصورة المرجعية» في القالب (A46:A48) ورقم المخرج في العمود B

async function loadTemplate(){
  const res=await fetch(TEMPLATE_URL,{cache:'no-store'});
  const type=(res.headers.get('content-type')||'').toLowerCase();
  if(!res.ok||type.includes('text/html'))throw new Error('تعذر تحميل قالب Excel الأصلي. لم يتم إنشاء ملف بديل.');
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  return wb;
}

function fillTemplate(ws,m){
  const num=v=>v===''||v===null||v===undefined?undefined:Number(v);
  const set=(addr,v)=>{if(v!==null&&v!==undefined&&v!=='')ws.getCell(addr).value=v};
  const row=(r,cols)=>Object.entries(cols).forEach(([col,v])=>set(col+r,v));
  const pd={...m.pd,name:m.name};
  const ex=m.extras||{};
  const lineCount=text=>String(text).split('\n').length;

  Object.entries(FIELD_CELLS).forEach(([key,addr])=>set(addr,pd[key]));
  set('A10',(pd.supporting_fields||[]).join(', '));
  const objectives=m.objectives.map((o,i)=>`${i+1}. ${o.text}`).join('\n');
  set('A12',objectives);
  if(objectives)ws.getRow(12).height=Math.max(ws.getRow(12).height||0,lineCount(objectives)*18);
  set('A15',`${pd.duration_days??''} يوم / ${pd.duration_hours??''} ساعة`);
  set('A16',`${pd.age_min??''} - ${pd.age_max??''}`);

  m.outputs.slice(0,TEMPLATE_LIMITS.outputs).forEach((o,i)=>{
    const ms=o.measurement||{};
    row(30+i,{F:o.output_no,E:o.name,D:o.output_type,C:o.description,B:num(o.quantity),A:o.ownership});
    row(38+i,{D:`${o.output_no} - ${o.name}`,C:ms.what_to_measure,B:ms.required_result,A:ms.verification_method});
  });
  m.days.slice(0,TEMPLATE_LIMITS.days).forEach((d,i)=>row(53+i,{G:d.day_no,F:d.what_to_learn,E:d.topics,D:(d.objective_ids||[]).map(x=>Number(x)+1).join(', '),C:(d.output_ids||[]).join(', '),B:d.execution_duration,A:d.verification}));
  m.human.slice(0,TEMPLATE_LIMITS.human).forEach((h,i)=>row(65+i,{D:h.resource_type,C:num(h.quantity),B:h.requirements,A:h.responsibilities}));
  m.material.slice(0,TEMPLATE_LIMITS.material).forEach((x,i)=>row(70+i,{F:x.item,E:x.specifications,D:x.unit,C:num(x.quantity_per_person_group),B:num(x.total_quantity),A:x.notes}));
  m.readiness.forEach((r,i)=>row(79+i,{C:r.category,B:r.preparation_requirements,A:r.lead_time}));
  attachmentDefs.forEach(([key],i)=>set('A'+(ATTACHMENT_FIRST_ROW+i),ex.attachments?.[key]?.name));

  // المراجعة العلمية والاعتماد: الصف 101 للمراجعة، والصف 102 للاعتماد (A التوقيع، B التاريخ، C الاسم)
  const ap=ex.approvals||{};
  [['review',101],['approve',102]].forEach(([k,r])=>row(r,{A:ap[k]?.signature,B:ap[k]?.date,C:ap[k]?.name}));
  // اكتمال الحقيبة
  (ex.checklist||[]).forEach((on,i)=>{if(on&&i<CHECKLIST.length)ws.getCell('A'+(106+i)).value='☑'});
}

// الصور المرجعية للمخرجات: أول صورة لكل مخرج في صفوف القالب (حتى 3)
async function addOutputImages(wb,ws,m){
  const items=m.outputs.map(o=>({no:o.output_no,img:(m.extras.output_images?.[o.output_no]||[])[0]})).filter(x=>x.img);
  if(!items.length)return {used:0,skipped:0,failed:0};
  const take=items.slice(0,IMAGE_ROWS);
  const get=await signedUrls(take.map(x=>x.img.path));
  let used=0,failed=0;
  for(let i=0;i<take.length;i++){
    const {no,img}=take[i];
    const ext=(img.name.split('.').pop()||'').toLowerCase().replace('jpg','jpeg');
    if(!['png','jpeg','gif'].includes(ext)){failed++;continue}
    try{
      const res=await fetch(get(img.path));
      if(!res.ok)throw new Error('http '+res.status);
      const id=wb.addImage({buffer:await res.arrayBuffer(),extension:ext});
      const r=IMAGE_FIRST_ROW+i;
      ws.getCell('B'+r).value=no;
      ws.getCell('A'+r).value=null;
      ws.getRow(r).height=90;
      ws.addImage(id,{tl:{col:0,row:r-1},ext:{width:Math.min(170,Math.round((ws.getColumn(1).width||24)*7)),height:90}});
      used++;
    }catch(e){console.error(e);failed++}
  }
  return {used,skipped:items.length-take.length,failed};
}

async function exportModel(m,{statusEl=null}={}){
  const say=msg=>{if(statusEl)statusEl.textContent=msg};
  say('جاري تجهيز ملف Excel...');toast('جاري تجهيز ملف Excel...');
  try{
    const wb=await loadTemplate();
    const ws=wb.getWorksheet(TEMPLATE_SHEET);
    if(!ws)throw new Error('ورقة قالب الحقيبة غير موجودة.');
    fillTemplate(ws,m);
    const imgRes=await addOutputImages(wb,ws,m);
    const blob=new Blob([await wb.xlsx.writeBuffer()],{type:XLSX_MIME});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=(m.name||'الحقيبة التدريبية').replace(/[\\/:*?"<>|]/g,'-').slice(0,80)+'.xlsx';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    const notes=[];
    if(m.outputs.length>TEMPLATE_LIMITS.outputs||m.days.length>TEMPLATE_LIMITS.days||m.human.length>TEMPLATE_LIMITS.human||m.material.length>TEMPLATE_LIMITS.material)notes.push('بعض الصفوف تجاوزت حدود القالب ولم تُصدَّر');
    if(imgRes.skipped)notes.push('القالب يتسع لثلاث صور مرجعية فقط');
    if(imgRes.failed)notes.push('تعذر تضمين بعض الصور (الصيغ المدعومة PNG وJPG وGIF)');
    const msg=notes.length?'تم التجهيز، لكن: '+notes.join('، ')+'.':'تم تجهيز ملف Excel بالقالب الأصلي.';
    say(msg);toast(msg);
  }catch(e){say('تعذر التصدير: '+e.message);toast('تعذر التصدير: '+e.message,'error')}
}

async function exportExcel(){
  if(!val('f_name'))return toast('اكتب اسم البرنامج أولاً','error');
  await saveBag({silent:true});
  await exportModel(modelFromEditor(),{statusEl:$('exportStatus')});
}
$('exportExcel').onclick=exportExcel;
