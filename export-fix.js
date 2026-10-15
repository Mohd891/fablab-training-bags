(()=>{
  const $=id=>document.getElementById(id);
  const mobileStyle=document.createElement('style');
  mobileStyle.textContent=`@media (hover:none) and (pointer:coarse){
html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
.app-shell{padding-top:78px!important;padding-bottom:0!important}
.sidebar{position:fixed!important;z-index:1000!important;left:0!important;right:0!important;top:0!important;bottom:auto!important;width:100%!important;height:68px!important;max-height:68px!important;padding:6px 8px!important;background:#111827!important;border-bottom:1px solid #283245!important;border-radius:0 0 18px 18px!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;overflow:hidden!important}
.sidebar-brand{display:none!important}
.sidebar nav{width:calc(100% - 100px)!important;flex:0 0 calc(100% - 100px)!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;align-items:stretch!important}
.nav-item{min-width:0!important;width:auto!important;height:54px!important;padding:5px 2px!important;margin:0!important;border-radius:12px!important;font-size:10px!important;text-align:center!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#aeb7c8!important;white-space:nowrap!important}
.nav-item:before{display:none!important}.nav-item.active{background:#202a3c!important;color:#fff!important}
.sidebar-bottom{position:absolute!important;left:auto!important;right:8px!important;top:6px!important;width:90px!important;height:54px!important;margin:0!important;padding:0!important;border:0!important;display:block!important}
.sidebar-bottom span{display:none!important}
.logout{position:static!important;width:90px!important;height:54px!important;border:0!important;border-radius:12px!important;background:#202a3c!important;color:#fff!important;font-size:10px!important;font-weight:800!important;padding:5px 3px!important;text-align:center!important;white-space:nowrap!important;display:flex!important;align-items:center!important;justify-content:center!important;opacity:1!important}
.logout:after{content:none!important;display:none!important}
.main-content{margin:0!important;width:100%!important;min-width:0!important;padding:16px 12px 24px!important}
.topbar{margin-bottom:15px!important}.topbar h2{font-size:22px!important}.topbar .primary{display:none!important}
.hero{display:block!important;width:100%!important;padding:20px 17px!important;border-radius:18px!important}.hero h3{font-size:21px!important;line-height:1.55!important}.hero p{font-size:12px!important;line-height:1.9!important}.hero .primary{width:100%!important}.hero-stat{display:none!important}
.stats-grid{grid-template-columns:1fr 1fr!important;gap:9px!important}.stat-card{padding:14px!important}.stat-card strong{font-size:22px!important}.section-card{padding:15px!important;border-radius:15px!important}
.section-head,.section-title{align-items:flex-start!important;flex-direction:column!important;gap:10px!important}.section-head button,.section-title button{width:100%!important}
.editor-layout{display:block!important}.section-nav{position:sticky!important;top:74px!important;z-index:20!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important;padding:7px!important;margin-bottom:12px!important}.section-tab{height:44px!important;padding:6px 8px!important;font-size:11px!important;margin:0!important;justify-content:flex-start!important}.section-tab b{width:25px!important;height:25px!important}
.editor-head{align-items:stretch!important;flex-direction:column!important}.editor-actions{width:100%!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important}.editor-actions .progress-pill{grid-column:1/-1!important;text-align:center!important}.editor-actions button{width:100%!important}
.form-grid,.item-grid,.readiness-grid,.attachment-grid{grid-template-columns:1fr!important}.form-grid .full,.item-grid .full{grid-column:auto!important}.inline-add{grid-template-columns:1fr!important}.inline-add button{width:100%!important}.repeat-item{padding:12px!important}.bag-row{align-items:flex-start!important;flex-direction:column!important;padding:12px!important}.bag-meta{width:100%!important;justify-content:space-between!important;gap:8px!important;flex-wrap:wrap!important}.progress-mini{width:80px!important}.export-card{padding:30px 12px!important}.export-card .primary{width:100%!important}.auth-card{max-width:calc(100vw - 32px)!important;padding:28px 20px!important}
}`;
  document.head.appendChild(mobileStyle);
  let saveTimer=null,silentUntil=0;
  const silenceToast=()=>{const e=$('toast');if(e){e.textContent='';e.className='toast';}};
  const originalToast=window.toast;
  if(typeof originalToast==='function')window.toast=(m,type='ok')=>{if(Date.now()<silentUntil){silenceToast();return;}return originalToast(m,type);};
  const silentSave=()=>{const b=$('saveBag'),ed=$('page-editor');if(!b||!ed||ed.classList.contains('hidden'))return;silentUntil=Date.now()+10000;b.click();silenceToast();setTimeout(silenceToast,50);setTimeout(silenceToast,300);setTimeout(silenceToast,1000);};
  const scheduleSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(silentSave,900);};
  const bindAutoSave=()=>{
    document.addEventListener('input',e=>{if(e.target.closest('#page-editor'))scheduleSave();},true);
    document.addEventListener('change',e=>{if(e.target.closest('#page-editor'))scheduleSave();},true);
    document.addEventListener('click',e=>{if(e.target.closest('#addObjective,#addOutput,#addDay,#addHuman,#addMaterial,.danger'))scheduleSave();},true);
    setInterval(silentSave,5000);
  };
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();

  const ATTACHMENT_LABELS={
    pre_post:'الاختبار القبلي والبعدي',
    scientific_content:'المحتوى العلمي التدريبي',
    presentation:'العرض التقديمي',
    technical_outputs:'ملفات المخرجات التقنية',
    student_guide:'دليل الطالب',
    reference_guide:'الدليل العلمي المرجعي للطالب',
    assessment:'نموذج تقييم التطبيقات والمخرجات',
    satisfaction:'استبانة رضا المستفيد'
  };

  const FIELD_MAP=[
    ['f_name','اسم البرنامج التدريبي'],
    ['__department','القسم'],
    ['f_program_type','نوع البرنامج'],
    ['f_description','وصف البرنامج التدريبي'],
    ['f_primary_field','المجال الأساسي'],
    ['f_supporting_fields','المجالات المساندة'],
    ['f_devices_software','الأجهزة والبرامج'],
    ['f_level','المستوى'],
    ['f_practical','نوع التطبيق العملي'],
    ['f_days','عدد الأيام'],
    ['f_hours','إجمالي الساعات'],
    ['f_age_min','العمر الأدنى'],
    ['f_age_max','العمر الأعلى'],
    ['f_target','الفئة المستهدفة'],
    ['f_participants','عدد المشاركين'],
    ['f_split','تقسيم المشاركين'],
    ['f_requirements','شروط الالتحاق'],
    ['f_author','مُعدّ المحتوى العلمي'],
    ['f_version','رقم الإصدار وتاريخ التحديث'],
    ['f_consumables','تكلفة المستهلكات'],
    ['f_setup','تكلفة تأسيسية غير متكررة'],
    ['f_other','اعتبارات أخرى']
  ];

  const HEADER_FILL='FF4F7B5C';
  const ZEBRA_FILL='FFF7F9F7';

  const styleHeaderRow=row=>{
    row.eachCell(cell=>{
      cell.font={bold:true,color:{argb:'FFFFFFFF'}};
      cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:HEADER_FILL}};
      cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    });
    row.height=22;
  };

  const zebraRows=(ws,fromRow,toRow)=>{
    for(let r=fromRow;r<=toRow;r++){
      if((r-fromRow)%2===1){
        ws.getRow(r).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:ZEBRA_FILL}}});
      }
    }
  };

  const rightAlignBody=(ws,fromRow,toRow)=>{
    for(let r=fromRow;r<=toRow;r++){
      ws.getRow(r).eachCell(cell=>{cell.alignment={horizontal:'right',vertical:'top',wrapText:true}});
    }
  };

  const exportWorkbook=async()=>{
    const status=$('exportStatus');
    try{
      if(typeof ExcelJS==='undefined')throw new Error('مكتبة ExcelJS غير محمّلة.');
      let appState={};
      try{appState=(typeof state!=='undefined'&&state)||{};}catch(_){appState={};}
      if(status)status.textContent='جاري تجهيز ملف Excel...';

      const wb=new ExcelJS.Workbook();
      wb.creator='فاب لاب الأحساء';
      wb.created=new Date();

      // ---- Sheet 1: بطاقة البرنامج ----
      const info=wb.addWorksheet('بطاقة البرنامج',{views:[{rightToLeft:true}]});
      info.columns=[{header:'الحقل',key:'k',width:28},{header:'القيمة',key:'v',width:60}];
      styleHeaderRow(info.getRow(1));
      FIELD_MAP.forEach(([id,label])=>{
        let v='';
        if(id==='__department')v=$('f_department')?.selectedOptions?.[0]?.textContent||'';
        else{const el=$(id);v=el?el.value.trim():'';}
        info.addRow({k:label,v});
      });
      const reviewStatusText={draft:'مسودة',review:'قيد المراجعة',completed:'مكتملة'}[$('reviewStatus')?.value]||'مسودة';
      info.addRow({k:'حالة المراجعة',v:reviewStatusText});
      info.addRow({k:'ملاحظات المراجعة',v:clean($('reviewComment')?.value)});
      rightAlignBody(info,2,info.rowCount);
      zebraRows(info,2,info.rowCount);

      if(Array.isArray(appState.objectives)&&appState.objectives.length){
        info.addRow([]);
        const h=info.addRow(['أهداف البرنامج']);
        h.font={bold:true};
        appState.objectives.forEach((o,i)=>{
          if(clean(o?.text))info.addRow([`الهدف ${i+1}`,clean(o.text)]);
        });
      }

      // ---- Sheet 2: المخرجات ----
      if(Array.isArray(appState.outputs)&&appState.outputs.length){
        const ws=wb.addWorksheet('المخرجات',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[
          {header:'رقم المخرج',key:'no',width:12},
          {header:'اسم المخرج',key:'name',width:28},
          {header:'النوع',key:'type',width:16},
          {header:'الوصف',key:'desc',width:40},
          {header:'العدد',key:'qty',width:10},
          {header:'الملكية',key:'own',width:16},
          {header:'ما سيتم قياسه',key:'measure',width:30},
          {header:'النتيجة المطلوبة',key:'result',width:30},
          {header:'طريقة التحقق',key:'verify',width:30}
        ];
        styleHeaderRow(ws.getRow(1));
        appState.outputs.forEach(o=>{
          ws.addRow({
            no:o.output_no,name:o.name||'',type:o.output_type||'',desc:o.description||'',
            qty:o.quantity||'',own:o.ownership||'',
            measure:o.measurement?.what_to_measure||'',
            result:o.measurement?.required_result||'',
            verify:o.measurement?.verification_method||''
          });
        });
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      // ---- Sheet 3: خطة التنفيذ ----
      if(Array.isArray(appState.days)&&appState.days.length){
        const ws=wb.addWorksheet('خطة التنفيذ',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[
          {header:'اليوم',key:'day',width:10},
          {header:'ماذا سنتعلم',key:'learn',width:36},
          {header:'المحاور',key:'topics',width:36},
          {header:'الأهداف المرتبطة',key:'obj',width:24},
          {header:'المخرجات المرتبطة',key:'out',width:24},
          {header:'مدة التنفيذ',key:'dur',width:16},
          {header:'التحقق',key:'verify',width:24}
        ];
        styleHeaderRow(ws.getRow(1));
        appState.days.forEach(d=>{
          const objLabels=(d.objective_ids||[]).map(x=>Number(x)+1).join('، ');
          const outLabels=(d.output_ids||[]).join('، ');
          ws.addRow({day:d.day_no,learn:d.what_to_learn||'',topics:d.topics||'',obj:objLabels,out:outLabels,dur:d.execution_duration||'',verify:d.verification||''});
        });
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      // ---- Sheet 4: الموارد البشرية ----
      if(Array.isArray(appState.human)&&appState.human.length){
        const ws=wb.addWorksheet('الموارد البشرية',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[
          {header:'المورد البشري',key:'type',width:24},
          {header:'العدد',key:'qty',width:10},
          {header:'الخبرة/الشروط المطلوبة',key:'req',width:36},
          {header:'المهام',key:'resp',width:36}
        ];
        styleHeaderRow(ws.getRow(1));
        appState.human.forEach(h=>ws.addRow({type:h.resource_type||'',qty:h.quantity??'',req:h.requirements||'',resp:h.responsibilities||''}));
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      // ---- Sheet 5: الاحتياجات المادية والتقنية ----
      if(Array.isArray(appState.material)&&appState.material.length){
        const ws=wb.addWorksheet('الاحتياجات المادية',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[
          {header:'الاحتياج',key:'item',width:26},
          {header:'الوحدة',key:'unit',width:12},
          {header:'المواصفات',key:'spec',width:36},
          {header:'الكمية للفرد/المجموعة',key:'qpp',width:18},
          {header:'الكمية الإجمالية',key:'total',width:16},
          {header:'ملاحظات',key:'notes',width:30}
        ];
        styleHeaderRow(ws.getRow(1));
        appState.material.forEach(m=>ws.addRow({item:m.item||'',unit:m.unit||'',spec:m.specifications||'',qpp:m.quantity_per_person_group??'',total:m.total_quantity??'',notes:m.notes||''}));
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      // ---- Sheet 6: الجاهزية ----
      if(Array.isArray(appState.readiness)&&appState.readiness.length){
        const ws=wb.addWorksheet('الجاهزية',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[
          {header:'البند',key:'cat',width:22},
          {header:'جاهز؟',key:'ready',width:10},
          {header:'ما يجب تجهيزه/التحقق منه',key:'prep',width:40},
          {header:'المدة اللازمة قبل التنفيذ',key:'lead',width:20},
          {header:'ملاحظات',key:'notes',width:30}
        ];
        styleHeaderRow(ws.getRow(1));
        appState.readiness.forEach(r=>ws.addRow({cat:r.category||'',ready:r.is_ready?'نعم':'لا',prep:r.preparation_requirements||'',lead:r.lead_time||'',notes:r.notes||''}));
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      // ---- Sheet 7: المرفقات ----
      const attachmentEntries=Object.entries(appState.attachments||{}).filter(([,f])=>f);
      if(attachmentEntries.length){
        const ws=wb.addWorksheet('المرفقات',{views:[{rightToLeft:true,state:'frozen',ySplit:1}]});
        ws.columns=[{header:'نوع المرفق',key:'type',width:30},{header:'اسم الملف',key:'file',width:40}];
        styleHeaderRow(ws.getRow(1));
        attachmentEntries.forEach(([key,f])=>ws.addRow({type:ATTACHMENT_LABELS[key]||key,file:f?.name||String(f)}));
        rightAlignBody(ws,2,ws.rowCount);
        zebraRows(ws,2,ws.rowCount);
      }

      const buf=await wb.xlsx.writeBuffer();
      const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const safeName=clean($('f_name')?.value||'الحقيبة التدريبية').replace(/[\\/:*?"<>|]/g,'-').slice(0,80);
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=safeName+'.xlsx';a.style.display='none';
      document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);
      if(status)status.textContent='تم تصدير الحقيبة بشكل منظم.';
    }catch(err){
      console.error(err);
      if(status)status.textContent='تعذر التصدير: '+(err?.message||err);
    }
  };

  const bind=()=>{
    const b=$('exportExcel');
    if(b)b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();exportWorkbook();},true);
  };
  const start=()=>{bindAutoSave();bind();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
