var myWebApi = null;

function getIdJsonElementFromString(theElementString) {     

    //A[1]["T"][1]
    //A,1],"T"],1]
    //A,1,"T",1
    
    var auxS = theElementString;
    if (auxS == null || auxS == "") {
        return null;
    }

    //A[1]["T"][1] -> A,1],"T"],1]
    //A,1,"T",1

    var auxArray = auxS.split("[");
    var auxArray2 = [];
    for (let i = 0; i < auxArray.length;i++) {
        var x2 = auxArray[i].replace("]", "");
        if (x2 != "") {
            auxArray2.push(x2);
        }        
    }
    if (auxArray2.length < 1) {
        return -1;
    }

    return auxArray2[auxArray2.length - 1];

}

/*
A função getJsonElementFromString, recebe um objeto json "theJsonObject" e uma descrição do nó que desejamos acessar "theElementString"

Seja o json abaixo:

thejson = "{
    "A":1,
    "B":{
        "C":2,
        "D":4,
        "E":6,
        "F":[1,2,3,4,5]
    },
    
}";

getJsonElementFromString('A') -> retorna 1
getJsonElementFromString('B["C"]') -> retorna 2
getJsonElementFromString('B["F"][2]') -> retorna 
getJsonElementFromString('B["F"]) -> retorna [1,2,3,4,5]
getJsonElementFromString('B') -> retorna "B":{"C":2,"D":4,"E":6"F":[1,2,3,4,5]}


 */
function getJsonElementFromString(theElementString, theJsonObject) {

    return eval("theJsonObject" + theElementString);

    /*//A[1]["T"][1]
    //A,1],"T"],1]
    //A,1,"T",1
    debugger

    var auxS = theElementString;
    if (auxS == null || auxS == "") {
        return null;
    }

    //A[1]["T"][1] -> A,1],"T"],1]

    var auxArray = auxS.split("[");
    var auxArray2 = [];
    for (let i = 0; i < auxArray.length;i++) {
        var x2 = auxArray[i].replace("]", "");
        if (x2 != "") {
            auxArray2.push(x2);
        }        
    }

    var myJsonObject = theJsonObject;
    for (let i = 0; i < auxArray2.length; i++) {
        myJsonObject = myJsonObject['"' + auxArray2[i] + '"'];
    }

    return myJsonObject;*/
}

function isCheckedCB(theName) {
    // Get the checkbox
    var checkBox = document.getElementById(theName);
    if (checkBox.checked == true) {
        return true;
    } else {
        return false;
    }
}

function setValueCB(theName, theValue) {
    // Get the checkbox
    ////console.log("setValueCB, theName:" + theName);
    ////console.log("setValueCB, theValue:" + theValue);
    var checkBox = document.getElementById(theName);
    if (theValue == "true") {
        checkBox.checked = true;
    } else {
        checkBox.checked = false;
    }
}

function resultToField(theResult, theTipo/*, theName*/) {
    ////console.log("resultToField:theResult:" + theResult);
    ////console.log("resultToField:theTipo:" + theTipo);
    ////console.log("resultToField:theName:" + theName);

    if (theTipo == "text") {
        if (theResult == null || theResult == "") {
            return "";
        }
        return theResult;
    }
    else if (theTipo == "integer") {
        if (theResult == null || theResult == "") {
            return 0;
        }
        return theResult;
    }
    else if (theTipo == "boolean") {
        if (theResult == false || theResult == "" || theResult == null || theResult == "false") {
            return "false";
        }

        return "true";
    }
    else if (theTipo == "date") {
        if (theResult == null) {
            return "";
        }
        var auxD = new Date(theResult);
        var dia = auxD.getDate();
        var mes = auxD.getMonth() + 1;
        var ano = auxD.getFullYear();
        var diaS = "";
        var diaM = "";

        if (dia < 9) {
            diaS = "0" + dia.toString();
        }
        else {
            diaS = dia;
        }

        if (mes < 9) {
            mesS = "0" + mes.toString();
        }
        else {
            mesS = mes.toString();
        }

        return diaS + "/" + mesS + "/" + ano;
    }
    else if (theTipo == "datetime") {
        if (theResult == null) {
            return "";
        }
        var auxD = new Date(theResult);
        var dia = auxD.getDate();
        var mes = auxD.getMonth() + 1;
        var ano = auxD.getFullYear();
        var hora = auxD.getHours();
        var minutos = auxD.getMinutes();

        var diaS = "";
        var diaM = "";
        var minutosS = "";

        if (dia <= 9) {
            diaS = "0" + dia.toString();
        }
        else {
            diaS = dia;
        }

        if (mes <= 9) {
            mesS = "0" + mes.toString();
        }
        else {
            mesS = mes.toString();
        }

        if (minutos <= 9) {
            minutosS = "0" + minutos.toString();
        }
        else {
            minutosS = minutos.toString();
        }

        return diaS + "/" + mesS + "/" + ano +  " " + hora + ":"+minutosS;
    }
    else if (theTipo == "objectid") {
        //CalcObjectID(" só na volta
        if (theResult == null || theResult == "") {
            return "";
        }
        return theResult;
    }
    else if(theTipo == "tinymce"){
        return theResult;
    }
    else if(theTipo == "base64"){
        return ((theResult ==null) || (theResult === undefined))? "":theResult
    }
}

function toBinary(string) {
    const codeUnits = Uint16Array.from(
      { length: string.length },
      (element, index) => string.charCodeAt(index)
    );
    const charCodes = new Uint8Array(codeUnits.buffer);
  
    let result = "";
    charCodes.forEach((char) => {
      result += String.fromCharCode(char);
    });
    return result;
  }

  function fromBinary(binary) {
    const bytes = Uint8Array.from({ length: binary.length }, (element, index) =>
      binary.charCodeAt(index)
    );
    const charCodes = new Uint16Array(bytes.buffer);
  
    let result = "";
    charCodes.forEach((char) => {
      result += String.fromCharCode(char);
    });
    return result;
  }

function initTinyMCE(theSelector,theContent){
    tinymce.init({
        selector: `${theSelector}`,
        plugins: 'table image fullscreen print',
        toolbar: `fullscreen print undo redo | styleselect | bold italic | blocks fontfamily fontsize | alignleft aligncenter 
                alignright alignjustify | bullist numlist outdent indent | table | image 
                | forecolor backcolor `,
        table_default_attributes: {
          border: '1'
        },
        table_default_styles: {
          'border-collapse': 'collapse'
        },
        image_title: true,
        image_caption: true,
        image_advtab: true,
        color_picker_callback: function(callback, value) {
          callback('#FF0000');
        },
        menubar: false,
        branding: false,
        font_formats: `Arial=arial,helvetica,sans-serif;Courier New=courier new,
                        courier,monospace;Georgia=georgia,times new roman,times,serif;
                        Tahoma=tahoma,arial,helvetica,sans-serif;Trebuchet MS=trebuchet ms,
                        geneva,sans-serif;Verdana=verdana,geneva,sans-serif`,
        fontsize_formats: '8pt 10pt 12pt 14pt 18pt 24pt 36pt',               


    }).then((editors)=>{
        try{
            let decoded = window.atob(theContent);
            const original = fromBinary(decoded);
            editors[0].setContent(original);           
        }
        catch(err){
            editors[0].setContent('');   
        }

    });
}

function initBase64(theSelector,theContent){
    try{
        let decoded = window.atob(theContent);
        const original = fromBinary(decoded);
        $(theSelector).val(original);                  
    }
    catch(err){        
        $(theSelector).val("");
    }    
}

function getIdObjetoFromLinhaListagem(linhaListagem, camposLObjeto, campoOId) {    
    var res = linhaListagem.split("-");
    var i = 0;
    for (i = 0; i < res.length; i++) {
        if (camposLObjeto[i] == campoOId) {            
            return res[0];
        }
    }

}

function fieldToResult(theField, theTipo) {
    
    if (theTipo == "text") {
        return theField;
    }
    else if (theTipo == "boolean") {
        if (theField == true) {
            return "true";
        }
        else {
            return "false";
        }
    }
    else if (theTipo == "date") {
        if (theField == "") {
            return "";
        }
        var auxArray = theField.split("/");
        var dia = auxArray[0];
        var mes = auxArray[1];
        var ano = auxArray[2];
        var auxD = new Date();
        auxD.setFullYear(ano);
        auxD.setDate(dia);
        auxD.setMonth(mes - 1);

        return auxD.toISOString();
    }
    else if (theTipo == "datetime") {
        if (theField == "") {
            return "";
        }
        var auxArray1 = theField.split(" ");

        var auxArray2 = auxArray1[0].split("/");
        var dia = auxArray2[0];
        var mes = auxArray2[1];
        var ano = auxArray2[2];

        var auxArray3 = auxArray1[1].split(":");
        var hora = auxArray3[0];
        var minuto = auxArray3[1];

        var auxD = new Date();
        auxD.setFullYear(ano);
        auxD.setDate(dia);
        auxD.setMonth(mes - 1);
        auxD.setHours(hora, minuto);
        
        return auxD.toISOString();
    }
    else if (theTipo == "objectid") {
        if (theField == null || theField == "") {
            return "";
        }
        return 'CalcObjectID("' + theField + '")';
    }
    else if (theTipo == "integer") {
        if (theField == null || theField == "") {
            return 0;
        }
        return Number.parseInt(theField);
    }
    else if(theTipo == "tinymce"){
        return theField;
    }
    else if(theTipo == "base64"){
        return theField;
    }
}

/*
 * Função: camposToJSONIdPlain (theId, camposFormObjeto, tipoCamposObjeto)
 *
 * theId --> um inteiro
 * camposFormObjeto -> Uma lista dos nomes dos elementos html de se quer extrair valores
 * camposObjeto     -> Uma lista dos nomes reais do campos, como devem constar no json
 * tipoCamposObjeto -> O tipo de cada campo acima (camposFormObjeto) 
 *
 * A função recebe uma lista de campos de elementos em uma página (ids) e seus respectivos tipos e transforma e um Json no
 * padrão:
 * {
 *  JSON da entidade! -> Lista de campos, com respectivos valores.
 * }
 *
 */

function replaceCalcObjectID(theValue) {
    if (theValue.startsWith('CalcObjectID("') && theValue.endsWith('")')) {
        var t1 = 'CalcObjectID("'.length;
        var t2 = '")'.length;
        var t3 = theValue.length;
        return theValue.substring(t1 - 1, t3 - 2);
    }

    return theValue;
}

//function camposToJSONIdPlain(theId, camposFormObjeto, camposObjeto, tipoCamposObjeto) {
function camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto) {
    var dados = {};
    if (camposObjeto == null || camposObjeto == "") {
        return dados;
    }
    var auxLen = camposFormObjeto.length;
    for (i = 0; i < auxLen; i++) {
        var theValueField = $(camposFormObjeto[i]).val();
        var tipoCampo = tipoCamposObjeto[i];
        var nameCampo = camposFormObjeto[i];
        let auxS1 = nameCampo.replace("#", "");

        if (tipoCampo == "boolean") {            
            //var auxS1 = nameCampo.replace("#", "");
            if (isCheckedCB(auxS1)) {
                theValueField = true;
            }
            else {
                theValueField = false;
            }
        }
        else if (tipoCampo == "tinymce"){
            let auxContent = tinymce.get(auxS1).getContent();
            let converted = toBinary(auxContent);
            let encoded = window.btoa(converted);
            theValueField = encoded;
        }
        else if(tipoCampo == "base64"){            
            let converted = toBinary(theValueField);
            let encoded = window.btoa(converted);
            theValueField = encoded;
        }

        //var auxResult = fieldToResult(theValueField, tipoCampo, nameCampo);
        var auxResult = fieldToResult(theValueField, tipoCampo);
        if (auxResult == "") {
            //dados[camposObjeto[i]] = null;
        }
        else {
            dados[camposObjeto[i]] = auxResult;
        }
    }
    return dados;
}


/*
 * Função: camposToJSONId (theId, nomeEntidade, camposFormObjeto, camposObjeto, tipoCamposObjeto)
 * 
 * theId --> um inteiro
 * camposFormObjeto -> Uma lista dos nomes dos elementos html de se quer extrair valores
 * camposObjeto     -> Uma lista dos nomes reais do campos, como devem constar no json
 * tipoCamposObjeto -> O tipo de cada campo acima (camposFormObjeto)
 * nomeEntidade -> O nome, o tipo, da entidade que vai representar o Json
 * 
 * A função recebe uma lista de campos de elementos em uma página (ids) e seus respectivos tipos e transforma e um Json no
 * padrão:
 * {
 *  'tipo': 'valorTipo',
 *  'dados'{
 *          JSON da entidade!
 *      }             *
 * }
 * 
 * 
 */

function camposToJSONId(nomeEntidade, camposFormObjeto, camposObjeto, tipoCamposObjeto) {
    var theJsonVar = {};
    theJsonVar["tipo"] = nomeEntidade;
    theJsonVar["dados"] = camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto);
    return theJsonVar;
}

function arrayToStr(theArray) {
    ////console.log("CommonUtils: arrayToStr:" + theArray);
    var auxS = "[";
    var theLen = theArray.length;
    for (i = 0; i < theLen; i++) {
        x = theArray[i];
        ////console.log("CommonUtils: arrayToStr,x:" + x);
        x = x.replace(/"/g, "\\\"");
        if (auxS == "[") {
            auxS += '"' + x + '"';
        }
        else {
            auxS += ',"' + x + '"';
        }
    }
    auxS += "]";
    return auxS;
}

function showWithDialog(theForm) {
    //$(theFormShowId).show();

    /*$(theForm).dialog({
        height: 'auto',
        width: 'auto',
        resizable: true,
        maxWidth: 600,
        maxHeight: 600,
        minHeight: 500,
        minWidth: 500
    });*/
}


function loadMoldeFromJson(theJsonFile, theEntityIndex, theFormId, theFormShowId, theFormIdChooser, theFormShowIdChooser, theTitleIdChooser) {    
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });
    $.get(theJsonFile, function (data, status) {        
        var auxJson = data;
        $.get("./MoldeGenerico.html", function (datamolde, statusTxt) {
            
            var auxData = "urlObter = '" + auxJson[theEntityIndex].urlObter + "'; \n" +
                "urlApagar = '" + auxJson[theEntityIndex].urlApagar + "'; \n" +
                "urlLoadObjetos = '" + auxJson[theEntityIndex].urlLoadObjetos + "'; \n" +
                "urlCount = '" + auxJson[theEntityIndex].urlCount + "'; \n" +
                "urlIncluir = '" + auxJson[theEntityIndex].urlIncluir + "'; \n" +
                "urlAlterar = '" + auxJson[theEntityIndex].urlAlterar + "'; \n";            
            auxData = auxData
                + 'camposFormObjeto =' + arrayToStr(auxJson[theEntityIndex].camposFormObjeto) + '; \n'
                + 'labelsFormObjeto = ' + arrayToStr(auxJson[theEntityIndex].labelsFormObjeto) + '; '
                + 'readOnlyFormObjeto = ' + arrayToStr(auxJson[theEntityIndex].readOnlyFormObjeto) + '; \n'
                + 'inputFieldFormObjeto = ' + arrayToStr(auxJson[theEntityIndex].inputFieldFormObjeto) + '; \n'
                + 'camposObjeto = ' + arrayToStr(auxJson[theEntityIndex].camposObjeto) + '; \n'
                + 'campoObjetoId = "' + auxJson[theEntityIndex].campoObjetoId + '"; \n'
                + 'camposListagemObjeto = ' + arrayToStr(auxJson[theEntityIndex].camposListagemObjeto) + '; \n'
                + 'camposFormClassObjeto = ' + arrayToStr(auxJson[theEntityIndex].camposFormClassObjeto) + '; \n'
                + 'nomeEntidade = "' + auxJson[theEntityIndex].nomeEntidade + '"; \n'
                + 'tipoCamposObjeto = ' + arrayToStr(auxJson[theEntityIndex].tipoCamposObjeto) + ';\n'
                + 'chooseFormObjeto = ' + arrayToStr(auxJson[theEntityIndex].chooseFormObjeto) + ';\n'
                + 'formIdChooser = "' + theFormIdChooser + '";\n'
                + 'formShowIdChooser = "' + theFormShowIdChooser + '";\n'
                + 'titleIdChooser = "' + theTitleIdChooser + '";\n'
                + 'urlJsonFile = "' + theJsonFile + '";\n'
                + 'formId = "' + theFormId + '";\n'
                ;     
            //Opcional Accordions
            if (auxJson[theEntityIndex].accordions == null) {
                auxData = auxData + 'accordions = null;\n';                
            }
            else {
                ////console.log("Tem accordion!" + auxJson[theEntityIndex].accordions);
                auxData = auxData + 'accordions = "' + auxJson[theEntityIndex].accordions + '";\n';
            }

            //Opcional camposFormObjetoOrder
            if (auxJson[theEntityIndex].camposFormObjetoOrder == null) {
                auxData = auxData + 'camposFormObjetoOrder = null;\n';
            }
            else {
                auxData = auxData + 'camposFormObjetoOrder = "' + auxJson[theEntityIndex].camposFormObjetoOrder + '";\n';
            }
            
            var auxData2 = datamolde.replace("//###SUBSTITUICAO", auxData);

            //Todos os campos do tipo date devem ter datapickers!
            var auxArrayT = auxJson[theEntityIndex].tipoCamposObjeto;
            var auxArrayF = auxJson[theEntityIndex].camposFormObjeto;
            var auxData3 = "";            
            for (var k = 0; k < auxArrayT.length; k++) {
                if (auxArrayT[k] == "date") {
                    auxData3 += '$("' + auxArrayF[k] + '").datepicker({dateFormat:"dd/mm/yy"});\n';
                }
            }
            if (auxData3 != "") {
                auxData2 = auxData2.replace("//###DATAPICKER", auxData3);
            }
            ////console.log("auxData2:" + auxData2);

            $(theFormId).html(auxData2);           


        });
        $(theFormShowId).show();
    }, "json");
}


function call_GET_JSON_PROMISE(urlGET, doMyTask, doMyTaskError) {    
    
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject)=> {
        $.ajax({            
            url: urlGET,
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            cache: false,
            success: function (data) {
                resolve(data);
            },
            error: function (err) {
                reject(Error("Ocorreu um erro em call_GET_JSON_PROMISE!" + err));
            }
        });
    });
    
    myCallPromise.then((data) => {
            doMyTask(data);
        }).catch((err) => {
            doMyTaskError(err);
    });
    
}

function call_GET_JSON_PURA_TOKEN_MEMOIZED(urlGET, token, urlToken, theDataMemoized) {
    ////console.log("->call_GET_JSON_PURA_TOKEN_MEMOIZED(" + urlGET + ",,)\n\t");
    if (theDataMemoized == null || theDataMemoized == "") {        
        return call_GET_JSON_PURA_TOKEN(urlGET, token, urlToken);
    }
    else {
        //console.log("   memoized!");
        var myCallPromise = new Promise((resolve, reject) => {
            resolve(theDataMemoized);
        });

        return myCallPromise;
    }
}


function call_GET_JSON_PURA_TOKEN(urlGET, token, urlToken) {
    //console.log("->call_GET_JSON_PURA_TOKEN(" + urlGET + ",token:" + ((token !=null & token !="")? "tem token":"nulo!") + ",)");
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });
    if (token !=null && token !="") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlGET,
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                cache: false,
                headers: { 'x-access-token': token },
                success: function (data) {
                    resolve(data);
                },
                error: function (err) {
                    reject(Error("Ocorreu um erro em call_GET_JSON_PURA_TOKEN" + err));
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlGET,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        cache: false,
                        headers: { 'x-access-token': token },
                        success: function (data) {
                            resolve(data);
                        },
                        error: function (err) {
                            reject(Error("Ocorreu um erro em call_GET_JSON_PROMISE!" + err));
                        }
                    });
                }).catch((errToken) => { reject(errToken);});                
            });
            return myCallPromise;       
        }
        else {
            throw 'call_GET_JSON_PURA_TOKEN: Token is null and UrlToken is null!';
        }
    }
}


function call_GET_JSON_PURA_TOKEN_WITH_DATA(urlGET, theData, token, urlToken) {
    
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    if (token != null && token != "") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlGET,
                type: "GET",
                contentType: "application/json",
                dataType: "json",
                data: theData,
                headers: { 'x-access-token': token },
                success: function (result) {
                    resolve(result);
                },
                error: function (message) {
                    reject(message);
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlDelete,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        data: theData,
                        headers: { 'x-access-token': token },
                        success: function (result) {
                            resolve(result);
                        },
                        error: function (message) {
                            reject(message);
                        }
                    });
                }).catch((errToken) => { reject(errToken); });
            });
            return myCallPromise;
        }
        else {
            throw 'call_GET_JSON_PURA_TOKEN_WITH_DATA: Token is null and UrlToken is null!';
        }
    }

}

function call_GET_JSON_PURA_MEMOIZED(urlGET, theDataMemoized) {  
    //console.log("->call_GET_JSON_PURA_MEMOIZED(" + urlGET + ")");
    if (theDataMemoized == null || theDataMemoized == "") {
        return call_GET_JSON_PURA(urlGET);
    }
    else {
        //console.log("   memoized!");
        var myCallPromise = new Promise((resolve, reject) => {
            resolve(theDataMemoized);
        });
        return myCallPromise;
    }
}

function call_GET_JSON_PURA(urlGET) {
    //console.log("->call_GET_JSON_PURA("+ urlGET + ")");

    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: urlGET,
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            cache: false,
            success: function (data) {
                resolve(data);
            },
            error: function (err) {
                reject(Error("Ocorreu um erro em call_GET_JSON_PROMISE!" + err));
            }
        });
    });

    return myCallPromise;

}

function clearSmartCardCache() {
    // clear browser authentication cache
    // IE specific
    try {
        document.execCommand("ClearAuthenticationCache", "false");
    }
    catch (e) {
        // do nothing
    }

    // clear for firefox or any browser that supports window.crypto API
    if (window.crypto && typeof window.crypto.logout === "function") {
        window.crypto.logout();
    }
    document.location.reload(true);
}


function call_GET_JSON(urlGET, doMyTask) {
    var myRetorno = "";
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });
    $.ajax({
        url: urlGET,
        type: "GET",
        contentType: "application/json; charset=utf-8",
        dataType: "json", 
        cache: false,
        success: function (data, statusTxt) {
            //myRetorno = data;         
            doMyTask(data);
        },
        error: function (message) {
            //console.log("Falhou:" + message);
            doMyTask("");
        }
    });
}

function call_POST_JSON_PROMISE_PURA(urlPost,theData) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: urlPost,
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: theData,
            success: function (result) {
                resolve(result);
            },
            error: function (message) {
                reject(message);
            }
        });
    });

    return myCallPromise;
}

function call_POST_JSON_PURA_TOKEN(urlPost, theData, token, urlToken) {
    //console.log("->call_POST_JSON_PURA_TOKEN(" + urlPost + ",,)");
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    if (token != null && token != "") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlPost,
                type: "POST",
                contentType: "application/json",
                dataType: "json",
                data: theData,
                headers: { 'x-access-token': token },
                success: function (result) {
                    resolve(result);
                },
                error: function (message) {
                    reject(message);
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlPost,
                        type: "POST",
                        contentType: "application/json",
                        dataType: "json",
                        data: theData,
                        headers: { 'x-access-token': token },
                        success: function (result) {
                            resolve(result);
                        },
                        error: function (message) {
                            reject(message);
                        }
                    });
                }).catch((errToken) => { reject(errToken); });
            });
            return myCallPromise;
        }
        else {
            throw 'call_GET_JSON_PURA_TOKEN: Token is null and UrlToken is null!';
        }
    }

}

function call_POST_JSON(urlPOST, theData, doMyTask, doMyTaskError) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    $.ajax({
        url: urlPOST,
        type: "POST",
        contentType: "application/json",
        dataType: "json",
        data: theData,
        success: function (result) {
            doMyTask(result);
        },
        error: function (message) {
            doMyTaskError(message);
        }
    });
}


function call_PUT_JSON_PROMISE_PURA(urlPut,theData) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: urlPut,
            type: "PUT",
            contentType: "application/json",
            dataType: "json",
            data: theData,
            success: function (result) {
                resolve(result);
            },
            error: function (message) {
                reject(message);
            }
        });  
        
    });

    return myCallPromise;
}

function call_PUT_JSON_PURA_TOKEN(urlPut, theData, token, urlToken) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    if (token != null && token != "") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlPut,
                type: "PUT",
                contentType: "application/json",
                dataType: "json",
                data: theData,
                headers: { 'x-access-token': token },
                success: function (result) {
                    resolve(result);
                },
                error: function (message) {
                    reject(message);
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlPut,
                        type: "PUT",
                        contentType: "application/json",
                        dataType: "json",
                        data: theData,
                        headers: { 'x-access-token': token },
                        success: function (result) {
                            resolve(result);
                        },
                        error: function (message) {
                            reject(message);
                        }
                    });
                }).catch((errToken) => { reject(errToken); });
            });
            return myCallPromise;
        }
        else {
            throw 'call_GET_JSON_PURA_TOKEN: Token is null and UrlToken is null!';
        }
    }

}

function call_PUT_JSON(urlPUT, theData, doMyTask, doMyTaskError) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    $.ajax({
        url: urlPUT,
        type: "PUT",
        contentType: "application/json",
        dataType: "json",
        data: theData,
        success: function (result) {
            doMyTask(result);
        },
        error: function (message) {
            doMyTaskError(message);
        }
    });  
}

function call_DELETE_JSON_PURA_TOKEN_WITH_DATA(urlDelete, theData, token, urlToken) {
    //console.log("->call_POST_JSON_PURA_TOKEN(" + urlPost + ",,)");
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    if (token != null && token != "") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlDelete,
                type: "DELETE",
                contentType: "application/json",
                dataType: "json",
                data: theData,
                headers: { 'x-access-token': token },
                success: function (result) {
                    resolve(result);
                },
                error: function (message) {
                    reject(message);
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlDelete,
                        type: "DELETE",
                        contentType: "application/json",
                        dataType: "json",
                        data: theData,
                        headers: { 'x-access-token': token },
                        success: function (result) {
                            resolve(result);
                        },
                        error: function (message) {
                            reject(message);
                        }
                    });
                }).catch((errToken) => { reject(errToken); });
            });
            return myCallPromise;
        }
        else {
            throw 'call_DELETE_JSON_PURA_TOKEN_WITH_DATA: Token is null and UrlToken is null!';
        }
    }

}

function IdsToValuesComplex(campoObjetoId, values){
    let auxResult = "";
    if(campoObjetoId.indexOf("||")==-1){
        auxResult = values[campoObjetoId];
    }
    else{
        //Temos uma chave primária de vários campos!
        let auxPkFields = campoObjetoId.split('||');
        let auxIdsValues = "";
        for(p=0;p<auxPkFields.length;p++){
            if(p>0){
                auxIdsValues+="||";
            }
            auxIdsValues += values[auxPkFields[p]];
        }
        auxResult = '('+campoObjetoId+'->'+ auxIdsValues + ')';
    }
    return auxResult;
}

function call_DELETE_JSON_PROMISE_PURA(urlDelete) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: urlDelete,
            type: "DELETE",
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                resolve(result);
            },
            error: function (message) {
                reject(message);
            }
        });
    });

    return myCallPromise;
}

function call_DELETE_JSON(urlDelete, doMyTask, doMyTaskError) {
    //console.log("urlDelete:" + urlDelete);
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    $.ajax({
        url: urlDelete,
        type: "DELETE",
        contentType: "application/json",
        dataType: "json",
        success: function (result) {
            doMyTask(result);
        },
        error: function (message) {
            doMyTaskError(message);
        }
    });
}

function getLengthObjectArray(theObjectArray) {
    if (theObjectArray == null || theObjectArray == "") {
        return -1;
    }

   
    if (Array.isArray(theObjectArray)) {
        return theObjectArray.length;
    }
    else {
        if (typeof theObjectArray == "object") {
            return Object.keys(theObjectArray).length;
        }        
    }
    return -1;
}

function call_DELETE_JSON_PURA_TOKEN(urlDelete, token, urlToken) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    if (token != null && token != "") {
        var myCallPromise = new Promise((resolve, reject) => {
            $.ajax({
                url: urlDelete,
                type: "DELETE",
                contentType: "application/json",
                dataType: "json",
                headers: { 'x-access-token': token },
                success: function (result) {
                    resolve(result);
                },
                error: function (message) {
                    reject(message);
                }
            });
        });
        return myCallPromise;
    }
    else { //Se temos uma url para obter o token e o token é nulo, obter o token primeiro!
        if (urlToken != null && urlToken != "") {
            var myCallPromise = new Promise((resolve, reject) => {
                call_GET_JSON_PURA(urlToken).then((dataToken) => {
                    return (dataToken['token']);
                }).then((token) => {
                    $.ajax({
                        url: urlDelete,
                        type: "DELETE",
                        contentType: "application/json",
                        dataType: "json",
                        headers: { 'x-access-token': token },
                        success: function (result) {
                            resolve(result);
                        },
                        error: function (message) {
                            reject(message);
                        }
                    });
                }).catch((errToken) => { reject(errToken); });
            });
            return myCallPromise;
        }
        else {
            throw 'call_GET_JSON_PURA_TOKEN: Token is null and UrlToken is null!';
        }
    }

}




function loadChooseFromJson(theJsonFile, theEntityIndex, theFormId, theFormShowId,theTitleId,idChooserReturn) {
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });
    $.get(theJsonFile, function (data, status) {
        var auxJson = data;
        //var auxJson = data.entities;
        $.get("./Chooser.html", function (datachooser, statusTxt) {
            var auxData = "urlLoadObjetos_Chooser = '" + auxJson[theEntityIndex].urlLoadObjetos + "'; \n" +
                "urlCount_Chooser= '" + auxJson[theEntityIndex].urlCount + "'; \n";

            auxData = auxData
                + 'camposFormObjeto_Chooser =' + arrayToStr(auxJson[theEntityIndex].camposFormObjeto) + '; \n'
                + 'camposObjeto_Chooser = ' + arrayToStr(auxJson[theEntityIndex].camposObjeto) + '; \n'
                + 'campoObjetoId_Chooser = "' + auxJson[theEntityIndex].campoObjetoId + '"; \n'
                + 'camposListagemObjeto_Chooser = ' + arrayToStr(auxJson[theEntityIndex].camposListagemObjeto) + '; \n'
                + 'nomeEntidade_Chooser = "' + auxJson[theEntityIndex].nomeEntidade + '"; \n'
                + 'tipoCamposObjeto_Chooser = ' + arrayToStr(auxJson[theEntityIndex].tipoCamposObjeto) + ';\n'
                + 'IdChooserReturn = "' + idChooserReturn+'";';            
            ////console.log(auxData);
            var auxData2 = datachooser.replace("//###SUBSTITUICAO", auxData);
            ////console.log(auxData2);

            $(theFormId).html(auxData2);
        });
        $(theTitleId).text("Escolha um item");
        //showWithDialog(theFormShowId);
        $(theFormShowId).show();
        /*$(theFormShowId).dialog({
            height: 'auto',
            width: 'auto',
            resizable: true,
            maxWidth: 600,
            maxHeight: 600,  
            minHeight: 500,
            minWidth: 500
        });*/
    }, "json");
}


function LoadListagemObjeto(theJsonFile, theEntityIndex, idObjetoDetalhe, theFieldView) {
    
    ////console.log("LoadListagemObjeto:theEntityIndex:" + theEntityIndex);
    ////console.log("LoadListagemObjeto:idObjetoDetalhe:" + idObjetoDetalhe);
    ////console.log("LoadListagemObjeto:theFieldView:" + theFieldView);
    if (idObjetoDetalhe == null || idObjetoDetalhe == "") {
        $(theFieldView).val("");
        return "";
    }
    ////console.log("LoadListagemObjeto:Oi!");
    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });
    $.get(theJsonFile, function (data, status) {        
        ////console.log("LoadListagemObjeto:Oi2!");
        var auxJson = data;
        var urlObter = auxJson[theEntityIndex].urlObter + idObjetoDetalhe;
        var camposListagemObjeto = auxJson[theEntityIndex].camposListagemObjeto;
        //tipoCamposObjeto = arrayToStr(auxJson[theEntityIndex].tipoCamposObjeto);
        //camposObjeto = arrayToStr(auxJson[theEntityIndex].camposObjeto);
        var auxLen = camposListagemObjeto.length;

        ////console.log("LoadListagemObjeto:urlObter:"+urlObter);

        //Agora vamos chamar a função web api para obter o objeto!
        $.ajax({
            url: urlObter,
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                // Agora tenho que decifrar o result!
                ////console.log("LoadListagemObjeto:camposListagemObjeto:!" + arrayToStr(camposListagemObjeto));
                auxS = "";
                var i = 0;
                for (i = 1; i < camposListagemObjeto.length; i++) {
                    ////console.log("LoadListagemObjeto:camposListagemObjeto[i]:" + camposListagemObjeto[i]);
                    ////console.log("LoadListagemObjeto:result:" + result[camposListagemObjeto[i]]);
                    if (result[camposListagemObjeto[i]] != null) {
                        if (auxS != "") {
                            auxS += " - ";
                        }
                        auxS += result[camposListagemObjeto[i]];
                    }                    
                }
                ////console.log("LoadListagemObjeto:auxS:" + auxS);
                $(theFieldView).val(auxS);
                return auxS;
            },
            error: function (message) {
                //console.log(message);
                return "ERRO!";
            }
        });


    }, "json");
}

function loadMoldeWebApiFromJson(theJsonFile, theWebApiIndex, theFormId) {   
    
    myWebApi = new WebApiGeneric(theJsonFile, theFormId,"myWebApi");    
    myWebApi.loadMoldeWebApi(theWebApiIndex);

}


