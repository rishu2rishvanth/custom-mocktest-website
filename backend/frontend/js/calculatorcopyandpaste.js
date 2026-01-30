let pasteBtn = null;
mockVar.pstids=[];
mockVar.mirrorele=null;

function createPasteBtn() {
	 if (!pasteBtn) {
	   pasteBtn = document.createElement('button');
	   pasteBtn.id = 'pasteBtn';
	   pasteBtn.textContent = 'Paste Here';
	   Object.assign(pasteBtn.style, {
	     position: 'absolute',
	     padding: '5px 10px',
	     backgroundColor: '#f5f5f5',
	     color: '#1976d2',
	     border: 'none',
	     borderRadius: '4px',
	     cursor: 'pointer',
	     display: 'none',
	     zIndex: 9999
	   });
	   document.body.appendChild(pasteBtn);
	 }
}


function createMirror() {
	 if ($('#mirror').length) {
		 $('#mirror').remove();
	 }
	 const mirror = document.createElement('div');
	mirror.id = 'mirror';
	 Object.assign(mirror.style, {
	   visibility: 'hidden',
	   whiteSpace: 'pre-wrap',
	   wordWrap: 'break-word',
	   position: 'absolute',
	   top: '0',
	   left: '0',
	   zIndex: '-1'
	 });
	 document.body.appendChild(mirror);
	 return mirror;
	}

function updateMirrorStyle(input, mirror) {
	const style = window.getComputedStyle(input);
    for (let prop of style) {
        if (prop === 'top' || prop === 'left') continue;
        mirror.style[prop] = style.getPropertyValue(prop);
 }}


function updatePasteButtonPosition(input) {
	 const isTextArea = input.tagName.toLowerCase() === 'textarea';
	 if (!pasteBtn) return;
	 if (isTextArea) {
	   $(input).css('overflow-y', 'scroll');
	   const mirror = createMirror();
	   updateMirrorStyle(input, mirror);
	   const val = input.value;
	   const pos = input.selectionStart;
	   
	   const beforeText = document.createTextNode(val.slice(0, pos));
	   const marker = document.createElement('span');
	   marker.textContent = '\u200b';
	   const afterText = document.createTextNode(val.slice(pos));
	   mirror.textContent = '';
	   mirror.append(beforeText, marker, afterText);
	   const inputRect = input.getBoundingClientRect();
	   
        mirror.style.setProperty(
         'top',
          `${window.scrollY + inputRect.top - input.scrollTop}px`,
            'important'
         );

              mirror.style.setProperty(
               'left',
               `${window.scrollX + inputRect.left}px`,
               'important'
            );

	  
	  
	   const caretRect = marker.getBoundingClientRect();
	   const pasteBtnWidth = pasteBtn.offsetWidth;
	   const inputRight = inputRect.left + input.offsetWidth;
	   const clampedLeft = Math.min(caretRect.left, inputRight - pasteBtnWidth);
	   pasteBtn.style.top = `${caretRect.top + window.scrollY - 30}px`;
	   pasteBtn.style.left = `${clampedLeft + window.scrollX}px`;
	   pasteBtn.style.display = 'inline-block';
	   marker.remove();
	   mockVar.mirrorele = mirror;
	 } else if (input.tagName === 'INPUT' && input.type === 'text') {
	   const inputRect = input.getBoundingClientRect();
	   const caretPos = input.selectionStart;
	   const dummy = document.createElement('span');
	   dummy.style.visibility = 'hidden';
	   dummy.style.position = 'absolute';
	   dummy.style.whiteSpace = 'pre';
	   dummy.style.font = window.getComputedStyle(input).font;
	   dummy.textContent = input.value.substring(0, caretPos);
	   document.body.appendChild(dummy);
	   const caretOffset = dummy.offsetWidth;
	   dummy.remove();
	   const scrollOffset = input.scrollLeft;
	   const left = inputRect.left + 8 + caretOffset - scrollOffset;
	   const maxLeft = inputRect.left + input.offsetWidth - pasteBtn.offsetWidth;
	   pasteBtn.style.left = `${Math.min(left, maxLeft)}px`;
	   pasteBtn.style.top = `${inputRect.top + window.scrollY - 30}px`;
	   pasteBtn.style.display = 'inline-block';
	 }
	}

function enablePasteButtonFor(inputId, sourceId) {
	 const input = document.getElementById(inputId);
	 const source = document.getElementById(sourceId);
	 if (!input || !source) return console.error('Invalid input or source element ID');
	 if (!mockVar.pstids.includes(input)) mockVar.pstids.push(input);
	 createPasteBtn();
	 updatePasteButtonPosition(input);
	 const update = () => updatePasteButtonPosition(input);
	 $(input).off('.paste').on('focus.paste input.paste click.paste keyup.paste', update);
	 pasteBtn.onclick = () => {
	   const textToPaste = source.textContent || source.value || '';
	   const start = input.selectionStart;
	   const end = input.selectionEnd;
      if(mockVar.iscopiedExpression==1)
      {
          const expr = document.getElementById("keyPad_UserInput1").value;
   	   input.value = input.value.substring(0, start) + mockVar.resultcopied + input.value.substring(end);
   	   input.selectionStart = input.selectionEnd = start + mockVar.resultcopied.length;
          mockVar.iscopiedExpression=0;
      }
      else
      {
          input.value = input.value.substring(0, start) + mockVar.resultcopied + input.value.substring(end);
          input.selectionStart = input.selectionEnd = start + mockVar.resultcopied.length;
      }
       auditlogCreation('paste here', 'Paste Here button clicked', 'Paste Result');
	   input.focus();
	   pasteBtn.style.display = 'none';
	   mockVar.pstids.forEach(item => $(item).off('.paste'));
	   mockVar.iscopied = 0;
	   mockVar.resultcopied = 0;
	   $('#printcpymsg').hide();
	 };
}

function run2(input_id) {
	 if (mockVar.iscopied === 1&&["Numeric","Alphanumeric","CANVAS","FileUpload"].includes(mockVar.curQuesBean.keyboardType)) {
	   enablePasteButtonFor(input_id, 'keyPad_UserInput');
	 }
	}

function removepaste(e){
	if (e.target.id!==mockVar.currclickedID && e.target !== pasteBtn) {
	  if(pasteBtn)
	  {
	    pasteBtn.style.display = 'none';
	  }
	  if(mockVar.mirrorele instanceof HTMLElement)
	  {
	  	mockVar.mirrorele.remove();
	  }
	}
}

$(document).off('click.rmpaste').on('click.rmpaste',removepaste);

function triggerpastebtn(event)
{
    const clickedelement=event.target;
    if((clickedelement.tagName==='TEXTAREA'||(clickedelement.tagName==='INPUT'&&(clickedelement.type==='text'||clickedelement.type==='number')))&&clickedelement.id!=='keyPad_UserInput1'&&clickedelement.id!=='keyPad_UserInput'&&mockVar.iscopied==1)
    {
		mockVar.currclickedID=clickedelement.id;
        run2(clickedelement.id);
    }
}

let savedRange = null;
var selwin;
let pasteBtnCke = null;
	function saveCaret(sel,ele) {
	   if (sel.rangeCount > 0) {
	     savedRange = sel.getRangeAt(0).cloneRange();
	     showButtonAtCaret(savedRange,ele);
	     selwin=sel;
	   }
	 }
	function showButtonAtCaret(range,ele) {
	   const rect = range.getBoundingClientRect();
	   if (rect && ele) {
	     ele.style.top = `${rect.top + window.scrollY + 20}px`;
	     ele.style.left = `${rect.left + window.scrollX}px`;
	     ele.style.display = "block";
	   }
	 }
	
	function insertTextAtCaret(ele) {
		  const pasteText = document.getElementById("keyPad_UserInput").value;

		  if (!savedRange || typeof selwin === 'undefined') return;

		  ele.style.display = 'none';
		  mockVar.iscopied = 0;
		  mockVar.iscopiedExpression = 0;
		  //mockVar.resultcopied = 0;
		  
		  selwin.removeAllRanges();
		  selwin.addRange(savedRange);

		  let textToInsert;
		  if (mockVar.iscopiedExpression === 1) {
		    const expr = document.getElementById("keyPad_UserInput1").value; 
		    textToInsert = mockVar.resultcopied; 
		    mockVar.iscopiedExpression = 0;
		  } else {
		    textToInsert = mockVar.resultcopied;
		  }
		  const textNode = document.createTextNode(textToInsert ?? "");
		  auditlogCreation('paste here', 'Paste Here button clicked', 'Paste Result');

		  const range = selwin.getRangeAt(0);
		  if (!range.collapsed) {
		    range.deleteContents();
		  }
		  range.insertNode(textNode);
		  range.setStartAfter(textNode);
		  range.collapse(true);
		  selwin.removeAllRanges();
		  selwin.addRange(range);
		  $('#printcpymsg').hide();
		}
	function createPasteBtnCke(editor){
		 // im using editor.document.$.getSelection() , this is native dom approach, because ckeditor api is 
	    // not working for some reason, the element is also passed in native dom way for easy styling reason
		
	    if (!pasteBtnCke || !editor.document.$.getElementById('pasteBtncke')) {
	    var body = editor.document.getBody();
		pasteBtnCke = new CKEDITOR.dom.element('button', editor.document);
	    pasteBtnCke.setAttribute('id', 'pasteBtncke');
	    pasteBtnCke.setAttribute('contenteditable', 'false');
	    pasteBtnCke.setStyle('position', 'absolute');
	    pasteBtnCke.setStyle('display', 'none'); 
	    pasteBtnCke.setStyle('padding', '5px 10px');
	    pasteBtnCke.setStyle('background-color', '#f5f5f5');
	    pasteBtnCke.setStyle('color', 'rgb(25, 118, 210)');
	    pasteBtnCke.setStyle('border', 'none');
	    pasteBtnCke.setStyle('border-radius', '4px');
	    var nativeBtn = pasteBtnCke.$; 
	    var styleTag = new CKEDITOR.dom.element('style', editor.document);
	    styleTag.setHtml('#pasteBtncke::before{content: "Paste Here"}');
	    editor.document.getHead().append(styleTag);
	    body.setStyle('position', 'relative');
	    var first = body.getFirst();
	    if (first) {
	    	pasteBtnCke.insertBefore(first);
	    } else {
	        body.append(pasteBtnCke);
	    }
	    
	  
	    
	   /* editor.on("blur", () => {
	    	const btn = editor.document.$.getElementById('pasteBtncke')
			if(btn)
				 btn.style.display = "none";
	    	});*/
	}
	}
	
	function run1(editor) {
		 if (mockVar.iscopied === 1) {
			 createPasteBtnCke(editor);
			 saveCaret(editor.document.$.getSelection(), editor.document.$.getElementById('pasteBtncke'));
		 }
		}
	function copyclicked()
	{
		if(mockVar.curQuesBean.keyboardType=='Numeric')
		{
			if(isFinite(jQuery('#keyPad_UserInput').val())==true)
			{
//			   $('#printcpymsg').text('Result copied Successfully...!!')
			   $('#printcpymsg').show();
		       mockVar.iscopied=1;
		       mockVar.resultcopied = $("#keyPad_OutputArea").val();
		       auditlogCreation("Copy","Copy button clicked","Copy Result");
			}
		}
		else
		{
//			 $('#printcpymsg').text('Result copied Successfully...!!')
			 $('#printcpymsg').show();
		     mockVar.iscopied=1;
		     mockVar.resultcopied = $("#keyPad_OutputArea").val();
		     auditlogCreation("Copy","Copy button clicked","Copy Result");
		}
	}
	function copywithcalculationclicked()
	{
	    if(mockVar.curQuesBean.keyboardType!=='Numeric')
	    {
//	    	   $('#printcpymsg').text('Calculation Result copied Successfully...!!')
		       $('#printcpymsg').show();
		       mockVar.iscopied=1;
		       mockVar.iscopiedExpression=1;
		       mockVar.resultcopied = $("#keyPad_UserInput1").val()+"="+$("#keyPad_OutputArea").val();
		       auditlogCreation("Copy","Copy with expression button clicked","Copy Result with calculation");
		}
	}
	 function helpclick() {
		let e;
        e=document.getElementById("printcpymsg");
        if(e.style.display!='none')
        {
            mockVar.rescpystringflag=1;
            $("#printcpymsg").hide();
        }
        $('#cpyresult').hide();
        $("#cpyresultcalculation").hide();
	}
	function helpbackclicked() {
	 
	    if( mockVar.rescpystringflag===1)
	    {
	         mockVar.rescpystringflag=0;
	         $("#printcpymsg").show();
	    }
	    if(mockVar.mockId.indexOf('M')!==0)
	    {
			$('#cpyresult').show();
			$("#cpyresultcalculation").show();
	    }
	}

	
	
	