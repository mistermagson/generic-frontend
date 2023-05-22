/*Tarefas de Código
 * 
 * -> Fazer com que os ids de GenericCRUD sejam uniformes a exemplo das outras classes (OK)
 * -> Todas as chamadas de função em scripts gerados devem se referenciar à variável GenericCRUD criada... myVar...
 * -> Fazer com que chamadas GET,PUT,POST,DELETE usem Promises!
 * -> Fazer hierarquia de classes, de forma que não se tenham métodos redundantes!
 * -> Tirar Redundâncias de código:
 *      -> Classe WebApiGeneric, WebCRUDGeneric e MenuButtonBar
 *          ->IdName
 * -> Fazer uma camada para utilização de webapi.json, de forma que se um dia tais o webapi.json seja substituído por um banco de dados, sem
 * problemas...
 */

class GenericElement {
    constructor(theJsonFile, theFormId, _myVarName) {        
        this.urlJsonFile = theJsonFile;
        this.formId = theFormId;
        this.fullArrayParameters = "";
        this.myVarName = _myVarName;
        this.arrayCaminhoId = null;        
    }

    dialogReposition(theDiv) {
        var smetrics = this.getScreenMetrics();        
        //$("#" + theDiv).parent().position({ my: smetrics['pmy'], at: smetrics['pat'], collision: smetrics['pcollision'] });     
        $("#" + theDiv).parent().position({ my: 'center center', at: 'center center', of: window, collision: 'fit' });        
    }


    getScreenMetrics(perfil = null) {
        //position: { my: "center", at: "center", collision:"fit" },
        var screenWidth = $(window).width();//window.screen.width;
        var screenHeight = $(window).height();// window.screen.height;
        var minh = 0;
        var maxh = 0;
        var minw = 0;
        var pmy = "center";
        var pat = "center";
        var pcollision = "fit";
        var mobile = (screenWidth < 600) ? true : false;
        var pof = window;

        if (mobile == true) {
            var fatorminh = 0.9
            var fatorminw = 0.9;

            if (perfil != null && perfil != "") {
                if (perfil == "Chooser") {
                    fatorminh = 0.7;
                    fatorminw = 0.6;
                }
            }

            var minh = screenHeight * fatorminh;
            var maxh = screenHeight;
            var minw = screenWidth * fatorminw;
            var pmy = "right top";
            var pat = "right top";
            var pcollision = "fit";
        }
        else {
            var fatorminh = 0.5;
            var fatorminw = 0.4;

            if (perfil != null && perfil != "") {
                if (perfil == "Chooser") {
                    fatorminh = 0.4;
                    fatorminw = 0.3;
                }
            }

            var minh = screenHeight * fatorminh;
            var maxh = screenHeight;
            var minw = screenWidth * fatorminw;   
            var pmy = "center";
            var pat = "center";            
            var pcollision = "fit";
        }

        var metrics = { 'minh': minh, 'maxh': maxh, 'minw': minw, 'pmy':pmy, 'pat':pat, 'pof':pof,'pcollision':pcollision};
        return metrics;
        
    }

    getVerticalSpace(theSize) {
        return '<span style="display: block;margin-bottom:'+ theSize +'"></span>';
    }

    idName(token) {
        ////console.log("->GenericElement.idName");
        var theName = this.myVarName + "_" + token;
        theName = theName.replace(/\./g, "_").replace(/\s/g, "_");
        if (theName.indexOf("#") > 0) {
            var aux = "#" + theName.replace("#", "");
            theName = aux;
        }

        return theName;
    }

    getMyTokenJsonPromise() {
        var auxToken = (this.myToken == null || this.myToken == "") ? null : { 'token': this.myToken };
        var myPromiseToken = call_GET_JSON_PURA_MEMOIZED("/myToken", auxToken);
        return myPromiseToken;
    }

    memoizeSetResult(memoizeCode, theResult) {
        var code = encodeURI(memoizeCode);
        if (this.LastGetResult == null || this.LastGetResult == "") {
            this.LastGetResult = {};
        }
        this.LastGetResult[code] = theResult;
    }

    memoizeGetResult(memoizeCode) {
        var code = encodeURI(memoizeCode);
        if (this.LastGetResult == null || this.LastGetResult == "") {
            this.LastGetResult = {};
            return null;
        }
        else {
            return this.LastGetResult[code];

        }
    }

  

    getArrayElementFromIdName(theJsonIdName) {
        var fieldArray = this.fullArrayParameters;
        if(this.arrayCaminhoId == null) {
            this.geraCaminhoIds();
        }
                
        var idArray = this.arrayCaminhoId[theJsonIdName];
        return eval("fieldArray" + idArray);

    }


    geraFiltro(filtro, arrayListaCampos) {
        if (filtro == null || filtro == "" || arrayListaCampos == null || arrayListaCampos.length == 0) {
            return "";
        }

        var auxFilter = 'or;'+filtro;

        if (auxFilter != null && auxFilter != "") {
            for (var i = 0; i < arrayListaCampos.length; i++) {
                auxFilter = auxFilter + ";" + arrayListaCampos[i];                
            }
        }

        

        return auxFilter;

    }



    
    async LoadListagemObjeto(idElementJson, idObjetoDetalhe, theFieldView, memoize=false) {        
        //console.log("->LoadListagemObjeto[\n\t");
        //idObjetoDetalhe é o id que quero traduzir ... gerar a fieldView
        //idElementJson --> De qual entidade eu quero traduzir ..

        //Problema: O que fazer quando aponta para webapiDialog de listagem ? Listar tudo e achar o valor ? Muito ineficiente;
        var auxArray = this.getArrayElementFromIdName(idElementJson);
        var auxTipo = auxArray.tipo;
        //var urlBase = this.fullArrayParameters.Confs.urlBase; 
        let urlBase = this.get_urlBase(auxArray);  
        var directPagination = (auxTipo == "webapiDialog" && auxArray.bindingParameters != null && auxArray.bindingParameters != "" &&
            auxArray.bindingParameters.directPagination == "true") ? "true" : "false";
        var urlObter = (auxTipo == "webapiDialog") ? auxArray.urlApi : ((auxTipo == "entity") ? (auxArray.urlObter + idObjetoDetalhe) : "");
        var urlObter = urlBase + urlObter;        
        var camposListagemObjeto = (auxTipo == "entity") ? auxArray.camposListagemObjeto : ((auxTipo == "webapiDialog") ? auxArray.out.camposListagemObjeto : "");
        var campoObjetoId = (auxTipo == "entity") ? auxArray.campoObjetoId : ((auxTipo == "webapiDialog") ? auxArray.out.campoObjetoId : "");
        var myObject = this;
       
        var myMemoizeCode = urlObter;
        var myPromise = null;
        if (memoize == true ) {
            myPromise = call_GET_JSON_PURA_TOKEN_MEMOIZED(urlObter, this.myToken, "/myToken", this.memoizeGetResult(myMemoizeCode));
        }
        else {
            myPromise = call_GET_JSON_PURA_TOKEN(urlObter, this.myToken, "/myToken");
        }
        
        var myRetorno = "";       
        

        await myPromise.then((result) => {
            // Agora tenho que decifrar o result!       
            if (memoize == true) { myObject.memoizeSetResult(myMemoizeCode, result); }
            
            if (directPagination == "false") {
                var auxS = "";
                for (var i = 0; i < camposListagemObjeto.length; i++) {

                    if (result[camposListagemObjeto[i]] != null) {
                        if (auxS != "") {
                            auxS += " - ";
                        }
                        auxS += result[camposListagemObjeto[i]];
                    }
                }
                if (theFieldView != null && theFieldView != "") {                   
                    $(theFieldView).val(auxS);
                    myRetorno = auxS;
                }
                else {
                    ////console.log(auxS);
                    //return auxS;
                    myRetorno = auxS;
                }                
            }
            else {//Quando é directPagination                
                var auxS = "";
                for (var j = 0; j < result.length; j++) {
                    if (result[j][campoObjetoId] == idObjetoDetalhe) {
                        for (var i = 0; i < camposListagemObjeto.length; i++) {
                            if (result[j][camposListagemObjeto[i]] != null) {
                                if (auxS != "") {
                                    auxS += " - ";
                                }
                                auxS += result[j][camposListagemObjeto[i]];
                            }
                        }
                        if (theFieldView != null && theFieldView != "") {                           
                            $(theFieldView).val(auxS);
                            myRetorno = auxS; 
                        }
                        else {
                            ////console.log(auxS);
                            //return auxS;  
                            myRetorno = auxS;
                        }
                        //$(theFieldView).val(auxS);   
                    }
                }
            }
        }).catch((err) => {
            alert("Ocorreu um erro:" + err);
        });
                

        if (idObjetoDetalhe == null || idObjetoDetalhe == "") {
            $(theFieldView).val("");
            return "";
        }
        else {
            return myRetorno;
        }
    }


    myDiv() {
        return this.idName("myDiv").replace(".", "_");
    }

    geraCaminhoIds() {        
        this.arrayCaminhoId = {};
        this.traverseJson(this.fullArrayParameters, "", this.arrayCaminhoId);
    }

    traverseJson(jsonObj, myKeyPath, myArray) {

        if (jsonObj !== null && typeof jsonObj == "object") {
            var arrayKeys = Object.keys(jsonObj);
            var arrayValues = Object.values(jsonObj);
            for (var i = 0; i < arrayKeys.length; i++) {
                var key = arrayKeys[i];
                var theKeyPath = "";

                if (isNaN(parseInt(key)) == false) {
                    theKeyPath = myKeyPath + "[" + key + "]";
                    //theKeyPath = myKeyPath + "/" + key;
                }
                else {
                    //theKeyPath = myKeyPath + '["' + key + '"]';
                    theKeyPath = myKeyPath + '["' + key + '"]';
                }


                var theValue = arrayValues[i];
                if (key == "id") {
                    //if (Array.isArray(theValue) == false) {
                    myArray[theValue] = myKeyPath;
                    ////console.log('myArray["' + theValue + '"]:' + myKeyPath);
                    //}
                }
                else {
                    this.traverseJson(theValue, theKeyPath, myArray);
                }

            }
        }
    }


}

class MenuButtonBar extends GenericElement {

    constructor(theJsonFile, theFormId,theDisplayFormId, _myVarName) {        
        super(theJsonFile, theFormId, _myVarName);
        this.DisplayFormId = theDisplayFormId;
        this.menuBarArray = null;
        this.hierarquia = null;
        this.idMenuBar = null;
        this.descricaoMenuBar = null;
        this.maxItensPerLine = null;
        this.arrayCaminhoId = null;
        this.myWebApi = null;
        this.myGenericCRUD = null;
        this.buttonCount = 0;
        this.barCount = 1;
        this.myHomeId = this.myVarName + "_theHomeMenu";
        this.myHamburgerId = this.idName("myHamburger");
        this.menuBarActiveOnHamburger = false;
        
    }
    getNameFromJsonElement(theJsonElement) {
        if (theJsonElement == null || theJsonElement == "") {
            return null;
        }
        var nome = theJsonElement.nome;
        if (nome == null || nome == "") {
            return null;
        }
        return nome;
    }


    buttonCreate(theCommand, theElement) {       

        var theJsonElement = null;
        var myButtonText = "";
        var myButtonId = "";
        var myScript = "";

        if (theCommand == "Grupo" || theCommand == "Nada") {
            //myButtonText = theElement.replace(";", "");
            let auxArray = theElement.split(";")
            myButtonText = auxArray[auxArray.length - 1];
            myButtonId = theElement.replace(/[;]/g, "").replace(/\s/g, "_").replace(/[/]/g, "_");

            if (theCommand == "Grupo") {
                myScript +=
                    '<script>' +
                    '$("#' + myButtonId + '").click(function () {' +
                        this.myVarName +'.getButtonMenu("'+ theElement +'");' +
                    '});' +
                    '\<\/script> '
                    ;

            }

        }
        else if (theCommand == "executarDialog") {            
            theJsonElement = getJsonElementFromString(theElement,  this.fullArrayParameters);            
            myButtonText = theJsonElement.nome;
            myButtonId = myButtonText.replace(";", "").replace(/\s/g, "_").replace("/", "_");            
            var tipoElement = theJsonElement.tipo;
            var theIndex = getIdJsonElementFromString(theElement);
            
            var ButtonCommand = "";
            if (tipoElement == "webapiDialog" && theIndex >= 0) { 
                ButtonCommand +=                    
                    this.myVarName + '.myWebApi = new WebApiGeneric("' + this.urlJsonFile + '","'+
                    this.DisplayFormId + '","' + this.myVarName + '.myWebApi");\n' +
                    this.myVarName + '.myWebApi.fullArrayParameters =' + this.myVarName + '.fullArrayParameters;\n' +
                    this.myVarName + '.myWebApi.loadMolde(' + theIndex + ');\n'+     
                    //this.myVarName + '.myGenericCRUD.myToken = ' + this.myVarName + '.myToken;\n'
                    this.myVarName + '.myWebApi.myToken = ' + this.myVarName + '.myToken;\n'

            }
            else if (tipoElement == "entity" && theIndex >= 0) {
                ButtonCommand +=                    
                    //aaa this.myVarName + '.createChooserElements();\n' +
                    this.myVarName + '.myGenericCRUD = new GenericCRUD(' +
                    //this.myVarName + '.myGenericCRUD = new miniCRUD(' +
                    '"' + this.urlJsonFile +                    
                    '","' + this.DisplayFormId +  
                    '","#myFormBar' +
                    '","' + this.idName("myChooser")+
                    '","' + this.idName("myChooserForm") +
                    '","' + this.idName("myChooserTitle") +
                    '","' + this.myVarName + '.myGenericCRUD");\n' +
                this.myVarName + '.myGenericCRUD.fullArrayParameters =' + this.myVarName +'.fullArrayParameters;\n' +
                    this.myVarName + '.myGenericCRUD.loadMolde(' + theIndex + ');\n' +
                this.myVarName + '.myGenericCRUD.myToken = ' + this.myVarName + '.myToken;\n'
                
            }
            myScript +=
                '<script>' +
                    '$("#' + myButtonId + '").click(function () {' +
                        ButtonCommand +
                    '});\n' +
                '\<\/script> '
                ;

        }
        
        var myHtml = "";
        
        if (this.buttonCount >= this.maxItensPerLine) {            
            var auxHtml2 = "";
            this.barCount = this.barCount + 1;

            var auxHamburgerActive = (this.menuBarActiveOnHamburger) ? "menubarlinksActive" : "menubarlinksNotActive";

            auxHtml2 +=
                '<nav class="navbar navbar-expand-sm bg-light" >' +
                '<div class="container">' +
            '   <div class="row">' +      
            '       <a class="transparentIconActive navbar-brand" href="#"  id="' + this.idName("transparentIconBars") + this.barCount + '">' +
            '          <img src="/svg/transparent-48px.svg"/>' +
            '       </a>' +
            '       <ul class="' + auxHamburgerActive + ' navbar-nav" id="' + this.idName("theMenuBar") + this.barCount + '"></ul>' +
                '   </div>' +
                '</div>'+
            '</nav >'
                ;

            $("#" + this.idName("myBars")).append(auxHtml2);
            this.buttonCount = 0;
        }

        myHtml += '<li class="nav-item">' +
            //'<button id="' + myButtonId + '" type="button" class="btn btn-primary mr-2" data-toggle="modal" ' +
            //' data-target="#myModal" >' +
            //myButtonText + '</button>' +
            '<a href="#" class="nav-link" id="' + myButtonId + '">' + myButtonText +'</a>'+
            '</li>';
       
        myHtml += myScript;

        var auxId = "#" + this.idName("theMenuBar") + this.barCount;
        
        $(auxId).append(myHtml);

        this.buttonCount = this.buttonCount +1;
        

    }

    navBarCreate() {
        this.buttonCount = 0;
        this.barCount = 0;

        var InicioScript =
            '<script>' +
            '$("#' + this.myHomeId + '").click(function () {' +
                    this.myVarName + '.getButtonMenu("");' +
                '});' +
            '\<\/script> '
            ;
        
        var myHtml = "";
        
        var auxStyle =
            '<style>'+
            '   @media screen and (max-width: 600px) {' +
            '       .menubarlinksNotActive{display: none;}' +     
            '       .transparentIconNotActive{display: none;}' +
            '       .menubarlinksActive{display: block;}' +
            '       .transparentIconActive{display: block;}' +
            '   }\n' +
            '   @media screen and (min-width: 601px){' +
            '       .hamburgerClass{display: none;}'+
            '   }'+
            '\<\/style>'
            ;

        var hamburgerScript =
            '<script>' +
            '   $("#' + this.myHamburgerId + '").click(function () {' +
                    this.myVarName + '.menuBarActiveOnHamburger = true;\n' +
            '       for(let z=0; z<' + this.myVarName+'.barCount +1 ; z++){\n'+  
            '           $("#' + this.idName("theMenuBar") + '" + z).toggleClass("menubarlinksNotActive");\n'+
            '           $("#' + this.idName("theMenuBar") + '" + z).toggleClass("menubarlinksActive");\n' +
            '           $("#' + this.idName("transparentIconBars") + '" + z).toggleClass("transparentIconNotActive");\n' +
            '           $("#' + this.idName("transparentIconBars") + '" + z).toggleClass("transparentIconActive");\n' +
            //'           $("#' + this.idName("theMenuBar") + '" + z).show();\n' +
            '       }'+
            //'       console.log("Cliquei no hamburger!");' +
            '   });\n' +
            '\<\/script>'
            ;
        var auxHamburgerActive = (this.menuBarActiveOnHamburger) ? "menubarlinksActive" : "menubarlinksNotActive";
        myHtml +=
            auxStyle +
            hamburgerScript +
        '<div id="' + this.idName("myBars") + '">' +
        '   <nav class="navbar navbar-expand-sm bg-light" >'+
        '       <div class="container">' +               
        '       <div class="row"  id="' + this.idName("theMenuBarRow") + this.barCount + '">' +   
        //Hamburger icon
        '       <a class="hamburgerClass navbar-brand" href="#" id="' + this.myHamburgerId + '">' +
        '          <img src="/svg/menu-48px.svg"/>' +
        '       </a>' +
        //Fim do Hamburger icon  
        '           <ul class="' +auxHamburgerActive + ' navbar-nav" id="' + this.idName("theMenuBar") + this.barCount + '">' +
        //Home 
        '          <li class="nav-item"><a class="nav-link" href="#" id="'+ this.myHomeId +  '">'+                    
        '              <img src="/svg/house-24px.svg" class=""  />'+
        '          </a></li>' +   
        '           </ul>' +      
        '       </div>'+
        '</div>'+
        '</nav >'+
        '</div>'
            ;
        myHtml += InicioScript;

        return myHtml;
    }


    traverseHierarquia(theHierarquia, theGroupPath, targetGroup) {
        //Se targetGroup  = "" é a raiz. Se targetGroup = ";Group1;Group2" só gerar de 
        //grupo específico
        
        if (theHierarquia !== null && typeof theHierarquia == "object") {
            var arrayKeys = Object.keys(theHierarquia);
            var arrayValues = Object.values(theHierarquia);
            for (var i = 0; i < arrayKeys.length; i++) {
                var key = arrayKeys[i];
                var theValue = arrayValues[i];
                if (theValue !== null && typeof theValue == "object") {
                    var myGroupPath = theGroupPath + ";" + key;
                    if (theGroupPath == targetGroup) {                        
                        ////console.log("Abri Menu->" + myGroupPath);   
                        this.buttonCreate("Grupo", myGroupPath);
                        //this.buttonCreate("Grupo", key);
                    }
                    this.traverseHierarquia(theValue, myGroupPath, targetGroup);
                }
                else
                {
                    if (theGroupPath == targetGroup) {
                        if (this.arrayCaminhoId[key] != null) {
                            var theArrayElement = this.arrayCaminhoId[key];
                            this.buttonCreate("executarDialog",theArrayElement);
                            ////console.log('Executar Dialog->' + theArrayElement);
                        }
                        else {
                            ////console.log('Não Implementado->' + key);
                            this.buttonCreate("Nada",key);
                        }
                    }
                }                
            }
        }
    }

    

    getButtonMenu(myGroupTarget) {
        //console.log("->getButtonMenu[\n\t");
        var myObject = this;
        
        //var auxToken = (this.myToken == null && this.myToken == "")? null: { 'token': this.myToken };
        //var myPromiseToken = call_GET_JSON_PURA_MEMOIZED("/myToken", this.myToken);
        var myPromiseToken = this.getMyTokenJsonPromise();
        myPromiseToken.then((dataToken) => {

            ////console.log("Meu Token:" + dataToken);
            myObject.myToken = dataToken['token'];           

            //var myPromise = call_GET_JSON_PURA_TOKEN(this.urlJsonFile,this.myToken,"/myToken");
            var myPromise = call_GET_JSON_PURA_TOKEN_MEMOIZED(this.urlJsonFile, this.myToken, "/myToken", this.fullArrayParameters);
            myPromise.then((data) => {
                this.fullArrayParameters = data;
                this.menuBarArray = data["MenuBar"];
                this.hierarquia = this.menuBarArray["Hierarquia"];
                this.idMenuBar = this.menuBarArray["id"];
                this.descricaoMenuBar = this.menuBarArray["descricao"];
                this.maxItensPerLine = this.menuBarArray["maxItensPerLine"];

                // Vamos executar nosso código extra aqui...            
                var auxHtml = "";



                /* Vou percorrer o elemento Menu Bar. O que for id vai acionar uma webapi ou um cadastro de entidade, o que não for id
                    * vai ser um grupo de comandos!
                    */

                //Criar a Barra!
                $("#" + this.formId).html(this.navBarCreate());



                //Primeiro vamos indexar todos os ids... achar a localização i,j,k,e
                this.geraCaminhoIds();
                this.traverseHierarquia(this.hierarquia, "", myGroupTarget);               

            }).catch((err) => {
                alert("Ocorreu um erro:" + err);
            });

        }).catch((errToken) => { alert("Ocorreu um erro:" + errToken); })
    }
}

class GenericDialog extends GenericElement {
    constructor(theJsonFile, theFormId, _myVarName) {
        super(theJsonFile, theFormId, _myVarName);

        this.arrayIdsListagem = [];

    }

    gerarAccordionPasso1(fieldArray, accordionArray) {

        if (fieldArray.accordions != null) {

            accordionArray.auxAccordionLabels = [];
            accordionArray.auxAccordionIndex = [];
            accordionArray.auxAccordionFirstIndex = [];
            accordionArray.auxAccordionLastIndex = [];


            var auxAccordion = fieldArray.accordions;
            var auxLen2 = auxAccordion.length;
            for (let i = 0; i < auxLen2; i++) {
                var auxAccordion2 = auxAccordion[i].split(";");
                accordionArray.auxAccordionLabels.push(auxAccordion2[0]);
                accordionArray.auxAccordionIndex.push(auxAccordion2[1]);
                var auxAccordion3 = auxAccordion2[1].split("-");
                accordionArray.auxAccordionFirstIndex.push(Number(auxAccordion3[0]));
                accordionArray.auxAccordionLastIndex.push(Number((auxAccordion3.length > 1) ? auxAccordion3[1] : auxAccordion3[0]));
            }
            return '<div id="'+ this.idName("myAccordions") + '">';
        }
        return "";
    }

    gerarAccordionPasso2(accordionArray, iIndex, iOrder) {
        
        var auxSHTML = "";
        var auxScript = "";
        if (accordionArray.auxAccordionFirstIndex != null) {
            if (accordionArray.auxAccordionFirstIndex.indexOf(iIndex + 1) != -1) {
                
                auxSHTML = '<div class="card"><div class="card-header"><a class="collapsed card-link d-flex justify-content-between" data-toggle="collapse" href="#collapse' + iOrder + '">'
                    + accordionArray.auxAccordionLabels[accordionArray.auxAccordionLabelIndex] +  
                    '<img id="collapse' + iOrder + '_img" src="/svg/keyboard_arrow_down-24px.svg"/>' +                    
                    '</a>' +
                    '</div>' +
                    '<div id="collapse' + iOrder + '" class="collapse" data-parent="#' + this.idName("myAccordions") + '">' +
                    '<div class="card-body">';
                auxScript = 
                    '<script>'
                    + '$("#collapse' + iOrder + '").on("show.bs.collapse", '
                    + '     function (){'
                    + '         $("#collapse' + iOrder + '_img").css({'
                    + '                 "transform": "rotate(180deg)"'                   
                    + '         });'
                    + '     });'
                    + '$("#collapse' + iOrder + '").on("shown.bs.collapse", '
                    + '     function (){'
                    +           this.myVarName + '.dialogReposition("' + this.myDiv() + '");'
                    + '     });'
                    + '$("#collapse' + iOrder + '").on("hide.bs.collapse", '
                    + '     function (){'
                    + '         $("#collapse' + iOrder + '_img").css({'
                    + '                 "transform": "rotate(360deg)"'
                    + '         });'
                    + '     });'
                    + '$("#collapse' + iOrder + '").on("hidden.bs.collapse", '
                    + '     function (){'
                    +           this.myVarName + '.dialogReposition("' + this.myDiv() + '");'
                    + '     });'
                    + '\<\/script>'
                    ;

                auxSHTML = auxSHTML + auxScript;
                accordionArray.auxAccordionLabelIndex = accordionArray.auxAccordionLabelIndex + 1;

            }
        }
        return auxSHTML;
    }

    getIOrderFromCampos(fieldArray, iIndex) {
        var iOrder = iIndex;
        if (fieldArray.camposFormObjetoOrder != null) {
            var auxiOrder = fieldArray.camposFormObjetoOrder;
            iOrder = auxiOrder[iIndex] - 1;
        }
        return iOrder;
    }

    gerarAccordionPasso3(accordionArray, iIndex) {
        var auxSHTML = "";

        if (accordionArray.auxAccordionLastIndex != null) {
            if (accordionArray.auxAccordionLastIndex.indexOf(iIndex + 1) != -1) {
                //auxSHTML += "</div></div></div>";
                auxSHTML += "</div></div></div>" + this.getVerticalSpace('0.3em');
            }
        }

        return auxSHTML;
    }

    gerarAccordionPasso4(accordionArray, iIndex) {
        var auxSHTML = "";

        if (accordionArray.auxAccordionFirstIndex != null) {

            auxSHTML = '</div>' + this.getVerticalSpace('0.5em');
        }

        return auxSHTML;
    }

    novoArrayAccordion() {
        return { auxAccordionLabels: null, auxAccordionIndex: null, auxAccordionFirstIndex: null, auxAccordionLastIndex: null, auxAccordionLabelIndex: 0 };
    }
    
    getHtmlFieldMoldeCadastro(fieldArray, iOrder, myDiv) {


        var auxSHTML = "";

        //var urlForChoosers = fieldArray.urlForChoosers;

        var auxS = fieldArray.camposFormObjeto[iOrder]
        var auxS3 = auxS.toString().replace("#", "");
        auxS = auxS3;
        var auxS2 = "";

        var auxLabel = fieldArray.labelsFormObjeto[iOrder];
        var auxClass = fieldArray.camposFormClassObjeto[iOrder];
        var auxReadOnly = fieldArray.readOnlyFormObjeto[iOrder];
        var auxDefaults = (fieldArray.Defaults !== undefined)? fieldArray.Defaults[iOrder]:"";
        var auxTypeField = fieldArray.inputFieldFormObjeto[iOrder];
        var ChooserIndex = fieldArray.chooseFormObjeto[iOrder];
        var tipoCamposObjeto = fieldArray.tipoCamposObjeto[iOrder];
        
        var ChooserIdName = (fieldArray.chooseFormObjeto != null && fieldArray.chooseFormObjeto != "")? fieldArray.chooseFormObjeto[iOrder]: "";

        const SelectRegex = /select\((\'\w+\')(,\'\w+\')*\)/gm;

        var ScriptChooser = "";

        ScriptChooser +=
            this.myVarName + '.myChooser = new GenericChooser(' + this.myVarName + '.urlJsonFile, ' + this.myVarName + '.formId,"' + this.myVarName + '.myChooser");\n' +
            this.myVarName + '.myChooser.myToken = ' + this.myVarName + '.myToken;\n' +
            this.myVarName + '.myChooser.fullArrayParameters = ' + this.myVarName + '.fullArrayParameters;\n' +
            this.myVarName + '.myChooser.loadNewChooser("' + ChooserIdName + '",' + this.myVarName + '.formId.replace("#", ""),"' + auxS + '" , "' + auxS + '_view");\n'
            ;

        if (fieldArray.chooseFormObjeto[iOrder] != "") {
            auxSHTML += '<div class= "form-group" >' +
                '           <label for="' + auxS + '">' + auxLabel + ':</label>' +
                '               <div class="form-row"><div class="col-1">' + auxTypeField + ' class="' + auxClass + '"' +
                '       id="' + auxS + '"' +
                '       ' + auxReadOnly + ' hidden />' +
                '           </div><div class="col-8"><input type=\"text\"' + ' class="' + auxClass + '" id="' + auxS + `_view" readOnly  value="${auxDefaults}"/>`                              
                + '</div>' +
                '       <div class="col-2"><button id="' + auxS + '_btnChooser" type="button" class="btn btn-primary mr-2"><img src="/svg/call_made-24px.svg" /></button></div></div>'
                + '<script> $("#' + auxS + '_btnChooser").click('
                + '     function () {'
                + ScriptChooser
                + '     });'
                + '\<\/script> '
                ;
        }
        else {

            if(SelectRegex.test(auxTypeField)){
                auxSHTML += `<div class= "form-group" >
                                <label for="${auxS}">${auxLabel}:</label>
                                <select class="${auxClass}" id="${auxS}" 
                                    ${auxReadOnly}  value="${auxDefaults}"
                                >`; 
                let auxSelect1 = auxTypeField.replace('select(','').replace(')','');
                let auxOptionArray = auxSelect1.split(',');
                for(let op=0;op<auxOptionArray.length;op++){                    
                    let theOption = auxOptionArray[op].replaceAll("'","");
                    auxSHTML += `<option value="${theOption}">${theOption}</option>`
                }
                auxSHTML += `</select>`;
            }
            else{
                auxSHTML += '<div class= "form-group" >' +
                '           <label for="' + auxS + '">' + auxLabel + ':</label>' +
                '   ' + auxTypeField + ' class="' + auxClass + '"' +
                '       id="' + auxS + '"' +
                '       ' + auxReadOnly + ` value="${auxDefaults}"/>`;              
            }


        }

        if (tipoCamposObjeto == "date") {
            auxS2 += '<script>'
                //+ '$("#' + auxS + '").datepicker({ dateFormat: "dd/mm/yy" });'
                + 'jQuery.datetimepicker.setLocale("pt-BR");'
                + 'jQuery("#' + auxS + '").datetimepicker({ format: "d/m/Y", timepicker:false });'
                + '\<\/script> '

                ;
            auxSHTML += auxS2;
        }
        else if (tipoCamposObjeto == "datetime") {
            auxS2 += '<script>'
                + 'jQuery.datetimepicker.setLocale("pt-BR");'
                + 'jQuery("#' + auxS + '").datetimepicker({ format: "d/m/Y H:i" });'
                + '\<\/script> '

                ;
            auxSHTML += auxS2;
        }
        else if(tipoCamposObjeto =='tinymce'){
            auxS2 += 
                `
                    <script>
                        tinymce.remove();
                        initTinyMCE('#${auxS}','');
                    </script>
                `;
                auxSHTML += auxS2;
        }
        else if(tipoCamposObjeto == 'base64'){
            auxS2 += 
                `
                    <script>                        
                        initBase64('#${auxS}','');
                    </script>
                `;
                auxSHTML += auxS2;
        }

        auxSHTML += '</div>';

        return auxSHTML;

    }

    getMoldeCadastro(fieldArray, inOut, divMolde, theIndex) {
        

        var myhtml = "";
              

        var theFieldArray = "";


        var theFieldArray = (inOut == 'in') ? fieldArray.in : (inOut == 'out') ? fieldArray.out : fieldArray;
        if (theFieldArray == null || theFieldArray == "") {
            return "";
        }
        var auxLen = theFieldArray.camposFormObjeto.length;
        //Accordion - geração -------------------            
        var accordionAuxArray = this.novoArrayAccordion();
        myhtml += this.gerarAccordionPasso1(theFieldArray, accordionAuxArray);
        //-------------------- fim accordion

        for (let i = 0; i < auxLen; i++) {
            var auxHtml = "";
            var iOrder = this.getIOrderFromCampos(theFieldArray, i);

            //Accordion - tags
            auxHtml += this.gerarAccordionPasso2(accordionAuxArray, i, iOrder);
            //-- Fim Accordion tags
            auxHtml += this.getHtmlFieldMoldeCadastro(theFieldArray, iOrder, divMolde);
            //Accordion tag
            auxHtml += this.gerarAccordionPasso3(accordionAuxArray, i);
            //Fim Accordion tag
            myhtml += auxHtml;
        }
        //Accordion fim tag------            
        myhtml += this.gerarAccordionPasso4(accordionAuxArray);
        //-----------------------
        
        

        return myhtml;
    }
         
    
    loadMolde(theWebApiIndex) {
        this.WebApiIndex = theWebApiIndex;
        var myObject = this;

        var theIndex = this.WebApiIndex;

        call_GET_JSON_PURA_TOKEN_MEMOIZED(this.urlJsonFile, this.myToken, "/myToken", this.fullArrayParameters).then((data) => {
            myObject.set_arrayParameters_MWAPI(data);
        }).catch((err) => {
            alert("Um erro ocorreu:" + err);
        });

        $(this.formId).show();
    }

    get_urlBase(theElement){
        let auxUrlBase = this.fullArrayParameters.Confs.urlBase;
        let desligaUrlBase = theElement.desligaUrlBase;        
        
        //---------- Situação em que precisamos desconsiderar urlBase -------------
        if(desligaUrlBase !== undefined || desligaUrlBase != null){
            auxUrlBase = (desligaUrlBase == "true")? "":auxUrlBase;
        }
        //-------------------------------------------------------------------------

        return auxUrlBase;
    }

    set_arrayParameters_MWAPI(theArray) {
        
        this.fullArrayParameters = theArray;

        this.urlBase = this.fullArrayParameters.Confs.urlBase;

        
    }

    htmlLgItemElement(theText) {
        return theText;
    }

    async getMoldeListagemMelhorado(result, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId, idToViewObjeto) {
        //console.log('->getMoldeListagemMelhorado(\n\t[');
        var myObject = this;
        var theIdView = idToViewObjeto;
        myObject.arrayIdsListagem = [];
        var auxK = 0;
        var theLen = getLengthObjectArray(result);

        for (let k = 0; k < theLen; k++) {
            var value = result[k];
            var auxLen = camposListagemObjeto.length;
            var auxS = "";
            for (var i = 0; i < auxLen; i++) {
                if (i > 0) {
                    auxS = auxS + '-';
                }
                var auxTipo = "";
                var idToViewField = "";

                //var auxName = "";
                for (var j = 0; j < camposObjeto.length; j++) {
                    if (camposObjeto[j] == camposListagemObjeto[i]) {
                        auxTipo = tipoCamposObjeto[j];
                        idToViewField = (theIdView != null && theIdView != "") ? theIdView[j] : "";
                        break;
                    }
                }
                var theFieldResult = resultToField(value[camposListagemObjeto[i]], auxTipo);
                if (idToViewField != null && idToViewField != "" && idToViewField !== undefined){ 
                    if(theFieldResult !== undefined && theFieldResult != null && theFieldResult !=""){
                        let auxDetalhe = await myObject.LoadListagemObjeto(idToViewField, theFieldResult, "",true);
                        auxS = auxS + auxDetalhe;
                    }
                }
                else {
                    auxS = auxS + theFieldResult;
                }
            }

            var auxIdLg = myObject.idName("arrayIdsListagem") + "_" + auxK;
            //var auxCheckLg = myObject.idName("arrayIdsListagemChk") + "_" + auxK;
            //var htmlCheckLg = '<input type="checkbox" value="" id="' + auxCheckLg + '"/>';
            auxK++;

            $('#' + myObject.idName("lg")).append(/*htmlCheckLg + */'<a id="' + auxIdLg
                + '" href="#" class="list-group-item list-group-item-action">'
                //+ auxS 
                + this.htmlLgItemElement(auxS)
                + '</a>'
            );

        
            let auxV = IdsToValuesComplex(campoObjetoId, value);
            myObject.arrayIdsListagem.push(auxV);
            

                     

        }        
    }



    getMoldeListagem(result, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId ) {
        var myObject = this;

        myObject.arrayIdsListagem = [];
        var auxK = 0;
        $.each(result, function (index, value) {
            
            var auxLen = camposListagemObjeto.length;
            var auxS = "";
            for (var i = 0; i < auxLen; i++) {
                if (i > 0) {
                    auxS = auxS + '-';
                }
                var auxTipo = "";
                //var auxName = "";
                for (var j = 0; j < camposObjeto.length; j++) {                    
                    if (camposObjeto[j] == camposListagemObjeto[i]) {
                        auxTipo = tipoCamposObjeto[j];
                        //auxName = camposFormObjeto[j];
                        break;
                    }
                }
                auxS = auxS + resultToField(value[camposListagemObjeto[i]], auxTipo);

                //var auxDetalhe = this.LoadListagemObjeto( idElementoJson, idObjetoDetalhe, "");
                //idElementoJson = qual o id do Dialog que vai traduzir o oid ?
                //arrayIdsListagemDetalhe = o oid = this.camposFormObjeto[i];
                //LoadListagemObjeto retorna o campo de listagem para aquele oid.
                
            }

            //--- Inicio da alteração
            //var auxIdLg = myObject.idName("altera") + value[campoObjetoId];
            var auxIdLg = myObject.idName("arrayIdsListagem") + "_"+ auxK;
            auxK++;

            $('#' + myObject.idName("lg")).append('<a id="' + auxIdLg
                + '" href="#" class="list-group-item list-group-item-action">'
                + auxS
                + '</a>'
            );

            let auxV = IdsToValuesComplex(campoObjetoId, value);
            myObject.arrayIdsListagem.push(auxV);

            //myObject.arrayIdsListagem.push(value[campoObjetoId]);
            ////console.log(myObject.arrayIdsListagem);
        });       
    }
}

class GenericChooser extends GenericDialog {
    constructor(theJsonFile, theFormId, _myVarName) {
        super(theJsonFile, theFormId, _myVarName);
        this.WebApiIndex = -1;
        this.ChooserProperties_MWAPI = {};           
    }
       

    myMainDivName(WebApiIndex) {
        var myDiv = "moldeChooser_" + WebApiIndex;
        return myDiv;
    }


    set_arrayParameters_MWAPI(theArray) {
        super.set_arrayParameters_MWAPI(theArray);
    }


    getInitialChooserProperties(myDiv, fieldArray, nameGlobal) {
        //var theurlBase = this.fullArrayParameters.Confs.urlBase;
        let theurlBase = this.get_urlBase(fieldArray);

        var theChooserProperties = {};

        theChooserProperties["myDiv"] = myDiv;
        theChooserProperties["maxPagina"] = 1;
        theChooserProperties["pagina"] = 1;
        theChooserProperties["filtro"] = "";
        theChooserProperties["nameGlobal"] = nameGlobal;
        theChooserProperties["ChooserReturn"] = "";
        theChooserProperties["ChooserReturnView"] = "";
        //theChooserProperties["translateId"] = (fieldArray["translateId"] == "false") ? "false" : "true";

        if (fieldArray.tipo == "entity") {
            theChooserProperties["urlCount"] = theurlBase + fieldArray.urlCount;
            theChooserProperties["urlList"] = theurlBase + fieldArray.urlLoadObjetos;
            theChooserProperties["pageSize"] = 4;
            theChooserProperties["camposListagemObjeto"] = fieldArray.camposListagemObjeto;
            theChooserProperties["camposObjeto"] = fieldArray.camposObjeto;
            theChooserProperties["campoObjetoId"] = fieldArray.campoObjetoId;
            theChooserProperties["tipoCamposObjeto"] = fieldArray.tipoCamposObjeto;
            theChooserProperties["IdToViewObjeto"] = fieldArray.IdToViewObjeto;
        }
        else if (fieldArray.tipo == "webapiDialog") {
            theChooserProperties["directPagination"] = fieldArray.bindingParameters["directPagination"];
            theChooserProperties["rootElement"] = fieldArray.bindingParameters["rootElement"];
            theChooserProperties["urlList"] = theurlBase + fieldArray.urlApi;
            theChooserProperties["camposListagemObjeto"] = fieldArray.out.camposListagemObjeto;
            theChooserProperties["camposObjeto"] = fieldArray.out.camposObjeto;
            theChooserProperties["campoObjetoId"] = fieldArray.out.campoObjetoId;
            theChooserProperties["tipoCamposObjeto"] = fieldArray.out.tipoCamposObjeto;
            theChooserProperties["IdToViewObjeto"] = fieldArray.out.IdToViewObjeto;

            if (theChooserProperties["directPagination"] != null
                && theChooserProperties["directPagination"] != ""
                && theChooserProperties["directPagination"] != "false")
            {
                theChooserProperties["urlCount"] = theChooserProperties["urlList"];                
                theChooserProperties["pageSize"] = 4;
                theChooserProperties["directPaginationArray"] = {};
            }
            else {
                theChooserProperties["directPagination"] = "false";
                theChooserProperties["urlCount"] = theurlBase + fieldArray.bindingParameters.urlCount;
                theChooserProperties["pageSize"] = fieldArray.bindingParameters.pageSize;
            }
            
            
        }

        return theChooserProperties;
    }


    loadNewChooser(ChooserIdName, mainDiv, IdOut, IdOutView) {    
        var fieldArray = this.fullArrayParameters;
        var auxS = "";
        
        var auxArray = this.getArrayElementFromIdName(ChooserIdName);
        var myDiv = this.idName("moldeWebApiDialogChooser_");

        

        $("#" + mainDiv).append("<div id='" + myDiv + "'/>");
        
        if ((auxArray.tipo == "webapiDialog" && (auxArray.bindingStrategy == "ListPageFilter") ) || (auxArray.tipo == "entity"))
        {            
            var theGlobalName = this.myVarName + ".ChooserProperties_MWAPI";
            this.ChooserProperties_MWAPI = this.getInitialChooserProperties(myDiv, auxArray, theGlobalName);

            var auxHtml = this.getMoldeChooser(this.ChooserProperties_MWAPI);
            $("#" + myDiv).html(auxHtml);

            var theReturn = theGlobalName + '.ChooserReturn';
            var theViewReturn = theGlobalName + '.ChooserReturnView';            
            var smetrics = this.getScreenMetrics("Chooser");
            var myObject = this;


            $("#" + myDiv).dialog({
                position: { my: smetrics['pmy'], at: smetrics['pat'], of:smetrics['pof'], collision: smetrics['pcollision'] },
                minHeight: smetrics['minh'],
                minWidth: smetrics['minw'],
                autoOpen: false,               
                close: function () {
                    if (IdOut != "") {
                        var auxId = eval(theReturn);                        
                        $("#" + IdOut).val(auxId);
                    }
                    if (IdOutView != "") {
                        $("#" + IdOutView).val(eval(theViewReturn));
                    }

                    $("#" + myDiv).remove();
                }
            });

                       
            $("#" + myDiv).dialog("option", "title", auxArray.nome);
            $("#" + myDiv).dialog("open");

        }      
        else
        {
            alert("Este não é um chooser!");
        }
            
        
    }

    async countObjeto(urlCount, theChooserProperties,token,urlToken){ 
        let quantidadeFinal = -1; 
        let pageSize = theChooserProperties.pageSize;
        
        const myfunc = async ()=>{
            let quantidade = -1;            
            var contaQuantidade = false;
            if (theChooserProperties["directPagination"] == "true") {
                contaQuantidade = true;
            } 

            let auxData = await call_GET_JSON_PURA_TOKEN(urlCount, token, urlToken);
            
            let rootElement = theChooserProperties["rootElement"];
            if(rootElement !== undefined || rootElement != null){
                quantidade = auxData[rootElement].length;
            }
            else if(Array.isArray(auxData)){ //Se o retorno for um array!
                quantidade = auxData.length;
            }
            else{
                quantidade = auxData;
            }
                
            
            //Acertando as propriedades do chooser
            theChooserProperties.maxPagina = quantidade / pageSize;
            theChooserProperties.maxPagina = Math.ceil(theChooserProperties.maxPagina); 
            
            return quantidade;
        }

        try{
            quantidadeFinal = await myfunc();
            return quantidadeFinal;
        }
        catch(err){
            return -1;
        }
    }
    

    montaChooserVazio(theChooserProperties) {
        var moldeDiv = theChooserProperties.myDiv;
        var camposListagemObjeto = theChooserProperties.camposListagemObjeto;
        var campoObjetoId = theChooserProperties.campoObjetoId;
        var cadastro_Chooser = this.idName("cadastro_Chooser");
        var lista_Chooser = this.idName("lista_Chooser");
        var busca_Chooser = this.idName("busca_Chooser");
        var filtro_Chooser = this.idName("filtro_Chooser");
        var btFiltra_Chooser = this.idName("btFiltra_Chooser");
        //var lg_Chooser = this.idName("lg_Chooser");
        var lg_Chooser = this.idName("lg");
        var FirstPageBtn_Chooser = this.idName("FirstPageBtn_Chooser");
        var LeftPageBtn_Chooser = this.idName("LeftPageBtn_Chooser");
        var RightPageBtn_Chooser = this.idName("RightPageBtn_Chooser");
        var LastPageBtn_Chooser = this.idName("LastPageBtn_Chooser");
        var ChooserReturn = this.idName("ChooserReturn");
        var OKBtn_Chooser = this.idName("OKBtn_Chooser");



        var htmlAux =
            '<div id="' + cadastro_Chooser + '">' +
            '    <div id="' + lista_Chooser + '">' +
            '        <form class="form-inline mx-auto" action="#" id="' + busca_Chooser + '">' +
            '            <div class="row">' +
            '                <div class="col">' +
            '                    <label for="filtro">Busca:</label>' +
            '                </div>' +
            '                <div class="col">' +
            '                    <input type="text" class="form-control" id="' + filtro_Chooser + '" />' +
            '                </div>' +
            '                <div class="col">' +
            '                    <button type="button" class="btn btn-primary" id="' + btFiltra_Chooser + '"><img src="/svg/search-24px.svg" /></button>' +
            '                </div>' +
            '            </div>' +
            //'            <input type="hidden" id="'+ ChooserReturn + '" value=""/>'+
            '        </form>' +
            '        <br />' +
            '        <div class="list-group" id="' + lg_Chooser + '">' +
            '        </div>' +
            '        <br />' +
            '        <ul class="pagination mx-auto">' +
            '            <li id="' + FirstPageBtn_Chooser + '" class="page-item"><a class="page-link" href="#"><img src="/svg/first_page-24px.svg" /></a></li>' +
            '            <li id="' + LeftPageBtn_Chooser + '" class="page-item"><a class="page-link" href="#"><img src="/svg/chevron_left-24px.svg" /></a></li>' +
            '            <li id="' + RightPageBtn_Chooser + '" class="page-item"><a class="page-link" href="#"><img src="/svg/chevron_right-24px.svg" /></a></li>' +
            '            <li id="' + LastPageBtn_Chooser + '" class="page-item"><a class="page-link" href="#"><img src="/svg/last_page-24px.svg" /></a></li>' +
            '        </ul>' +
            '    </div>' +
            '   <button id="' + OKBtn_Chooser + '" type="button" class="btn btn-primary">OK</button>' +
            '</div>' +
            '<script>' +
            '   $("#' + lg_Chooser + '").on("click", "a", function (event) {' +
            //'\n debugger \n'+
            '       var clicado = $(this).text();\n' +
            '       var theIndex = this.id.split("_")[this.id.split("_").length -1];\n' +
            '       var theId2 = ' + this.myVarName + ".arrayIdsListagem[theIndex];\n"+ 
            //"       var AuxArray1 = JSON.parse('" + JSON.stringify(camposListagemObjeto) + "');\n" +
            //"       var AuxArray2 = " + JSON.stringify(campoObjetoId) + ";\n" +
            //'       var theId = getIdObjetoFromLinhaListagem(clicado, AuxArray1,AuxArray2);\n' +
            '       ' + theChooserProperties.nameGlobal + '.ChooserReturn = theId2;\n' +
            '       ' + theChooserProperties.nameGlobal + '.ChooserReturnView = clicado;' +
            '   });' +
            '   $("#' + btFiltra_Chooser + '").click( function(){' +
            '     ' + theChooserProperties.nameGlobal + '.filtro = $("#' + filtro_Chooser + '").val();' +
            '     ' + theChooserProperties.nameGlobal + '.pagina = 1;' +
            '       ' + this.myVarName + '.getMoldeChooser(' + theChooserProperties.nameGlobal + ');' +
            '   });' +
            '   $("#' + FirstPageBtn_Chooser + '").click( function(){' +
            '     ' + theChooserProperties.nameGlobal + '.pagina = 1;' +
            '       ' + this.myVarName + '.getMoldeChooser(' + theChooserProperties.nameGlobal + ');' +
            '   });' +
            '   $("#' + LeftPageBtn_Chooser + '").click( function(){' +
            '       if(' + theChooserProperties.nameGlobal + '.pagina > 1){' +
            '           ' + theChooserProperties.nameGlobal + '.pagina = ' + theChooserProperties.nameGlobal + '.pagina -1;' +
            '           ' + this.myVarName + '.getMoldeChooser(' + theChooserProperties.nameGlobal + ');' +
            '       }' +
            '   });' +
            '   $("#' + RightPageBtn_Chooser + '").click( function(){' +
            //' debugger \n'+
            '       if(' + theChooserProperties.nameGlobal + '.pagina < ' + theChooserProperties.nameGlobal + '.maxPagina ){\n' +
            '           ' + theChooserProperties.nameGlobal + '.pagina = ' + theChooserProperties.nameGlobal + '.pagina + 1;\n' +
            '           ' + this.myVarName + '.getMoldeChooser(' + theChooserProperties.nameGlobal + ');\n' +
            '       }\n' +
            '   });' +
            '   $("#' + LastPageBtn_Chooser + '").click( function(){' +
            '     ' + theChooserProperties.nameGlobal + '.pagina = ' + theChooserProperties.nameGlobal + '.maxPagina ;' +
            '       ' + this.myVarName + '.getMoldeChooser(' + theChooserProperties.nameGlobal + ');' +
            '   });' +
            '   $("#' + OKBtn_Chooser + '").click(function () {' +
            '       $("#' + moldeDiv + '").dialog("close");' +
            '   });' +

            '\<\/script> '
            ;



        return htmlAux;
    }

    async getMoldeChooser(theChooserProperties) {
        //console.log('->getMoldeChooser(\n\t[');
        var auxhtml = "";
        var urlCount = theChooserProperties.urlCount;//fieldArray.bindingParameters.urlCount;
        var urlList = theChooserProperties.urlList;//fieldArray.urlApi;
        var pageSize = theChooserProperties.pageSize;//fieldArray.bindingParameters.pageSize;
        var count = 0;
        //var auxQuant = 0;
        var camposListagemObjeto = theChooserProperties.camposListagemObjeto;//fieldArray.out.camposListagemObjeto;
        var camposObjeto = theChooserProperties.camposObjeto; //fieldArray.out.camposObjeto;
        var campoObjetoId = theChooserProperties.campoObjetoId;//fieldArray.out.campoObjetoId;
        var tipoCamposObjeto = theChooserProperties.tipoCamposObjeto;//fieldArray.out.tipoCamposObjeto;        
        var moldeDiv = theChooserProperties.myDiv;
        var idToViewObjeto = theChooserProperties.IdToViewObjeto;
        //var lgChooser = this.idName("lg_Chooser");       
        var lgChooser = this.idName("lg");       
               

        //auxhtml = montaChooserVazio(moldeDiv, camposListagemObjeto, campoObjetoId);
        auxhtml = this.montaChooserVazio(theChooserProperties);


        //Quantidade de objetos
        count = await this.countObjeto(urlCount,theChooserProperties,this.myToken, "/myToken");

       

        // Vamos pegar o json e preencher o Chooser!

        var auxFilter = this.geraFiltro(theChooserProperties.filtro, camposListagemObjeto);
        var urlAux = urlList;
        if (theChooserProperties.directPagination == null ||
            theChooserProperties.directPagination == "" ||
            theChooserProperties.directPagination == "false")
        {
            urlAux += pageSize + '&page=' + theChooserProperties.pagina + '&filtro=' + encodeURIComponent(auxFilter);
        }              
        

        var myObject = this;

        call_GET_JSON_PURA_TOKEN(urlAux, this.myToken, "/myToken").then((resultAux) => {
            let result = undefined;
            
            //Tem Root Element?
            let rootElement = theChooserProperties["rootElement"];
            if(rootElement !== undefined || rootElement != null){
                result = resultAux[rootElement];
            }
            else{
                result = resultAux;
            }
            //Fim tratamento rootElement...

            $("#" + moldeDiv).html(auxhtml);
            if (theChooserProperties.directPagination == null ||
                theChooserProperties.directPagination == "" ||
                theChooserProperties.directPagination == "false") {
                //myObject.getMoldeListagem(result, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId);                
                myObject.getMoldeListagemMelhorado(result, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId, idToViewObjeto);                
            }
            else {
                var result2 = {};
                var inicio = (theChooserProperties["pagina"] - 1) * theChooserProperties["pageSize"];
                var max = inicio + theChooserProperties["pageSize"];
                var auxLen = (result.length > max) ? max : result.length;
                let j = 0;
                for (let i = inicio; i < auxLen; i++) {
                    result2[j] = result[i];
                    j = j + 1;
                }
                //myObject.getMoldeListagem(result2, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId);
                myObject.getMoldeListagemMelhorado(result2, camposListagemObjeto, camposObjeto, tipoCamposObjeto, campoObjetoId, idToViewObjeto);
            }
            myObject.dialogReposition(moldeDiv);
        }).catch((err) => {
            alert(err);
        });

        

        return auxhtml;

    }


}

class WebApiGeneric extends GenericDialog{

    constructor(theJsonFile, theFormId, _myVarName) {
        
        super(theJsonFile, theFormId, _myVarName);        
            
        this.WebApiIndex = -1;           

        this.myChooser = null;
    }

    myMainDivName(WebApiIndex){
        var myDiv = "moldeWebApiDialog_" + WebApiIndex;
        return myDiv;
    }
     
    MoldeAPI_chamarWS(divMolde, theWebApiIndex) {  


        //var theurlBase = this.fullArrayParameters.Confs.urlBase;   
        
        var theFieldArray = this.fullArrayParameters.webapiDialogs[theWebApiIndex];
        let theurlBase = this.get_urlBase(theFieldArray);     
        
        var method = theFieldArray.httpMethod;
        var urlApi = theurlBase + theFieldArray.urlApi;
        var camposFormObjeto = (theFieldArray.in == null || theFieldArray.in =="")? "":theFieldArray.in.camposFormObjeto;
        var camposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.camposObjeto;
        var bindingStrategy = theFieldArray.bindingStrategy;
               

        if (bindingStrategy == "SimpleId" && method == "GET") {
            //Simplesmente concatene com a string da url o valor dos camposFormObjeto, concatenados por "_"
            var auxLen = camposFormObjeto.length;
            var myUrl = urlApi;
            for (let i = 0; i < auxLen; i++) {
                myUrl += $(camposFormObjeto[i]).val();
            }
            
            var myPromise = call_GET_JSON_PURA_TOKEN(myUrl,this.myToken, "/myToken");
            myPromise.then((data) => {
                var theArray = data;
                var outValues = theArray;
                var auxS = this.getMoldeCadastro(theFieldArray, "out", divMolde, theWebApiIndex);
                $('#' + divMolde).html(auxS);
                this.preencheMoldeCadastro(theFieldArray.out, outValues);
            }).catch((err) => {
                alert("Ocorreu um erro:" + err);
            });

        }
        else if (bindingStrategy == "directQuery" & method == "GET") {           
            var myUrl = urlApi;
           
            var myPromise = call_GET_JSON_PURA_TOKEN(myUrl, this.myToken, "/myToken");
            myPromise.then((data) => {
                var theArray = data;
                var outValues = theArray;                                
                var auxS = this.getMoldeCadastro(theFieldArray, "out", divMolde, theWebApiIndex);
                $('#' + divMolde).html(auxS);
                $('#directQueryOut').val(JSON.stringify(outValues));                
            }).catch((err) => {
                alert("Ocorreu um erro:" + err);
            });
        }
        else if (bindingStrategy == "QueryParams" && method == "GET") {
            //Simplesmente concatene com a string da url o valor dos camposFormObjeto, concatenados por "&nomeCampo="
            var auxLen = camposFormObjeto.length;
            var myUrl = urlApi;
            for (let i = 0; i < auxLen; i++) {
                let myfield = camposObjeto[i];
                let myvalue = $(camposFormObjeto[i]).val();
                myUrl += '&' + myfield + '=' + myvalue;
                //myUrl += $(camposFormObjeto[i]).val();
            }

            var myPromise = call_GET_JSON_PURA_TOKEN(myUrl, this.myToken, "/myToken");
            myPromise.then((data) => {
                var theArray = data;
                var outValues = theArray;
                var auxS = this.getMoldeCadastro(theFieldArray, "out", divMolde, theWebApiIndex);
                $('#' + divMolde).html(auxS);
                this.preencheMoldeCadastro(theFieldArray.out, outValues);
                this.dialogReposition(divMolde);
            }).catch((err) => {
                alert("Ocorreu um erro:" + err);
            });
        }
        else if (bindingStrategy == "JsonIn" && method == "POST") {
            //Simplesmente chame o web service POST, com o json dos campos de entrada!  
            
            var camposFormObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" : theFieldArray.in.camposFormObjeto;
            var camposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.camposObjeto;
            var tipoCamposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.tipoCamposObjeto;
            var theJson = camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto);

            

            call_POST_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Gravado com sucesso!");
                $('#' + divMolde).dialog("close");
            }).catch((err) => {
                alert("Problemas na Gravação!" + err);
                $('#' + divMolde).dialog("close");
            });
        }
        else if (bindingStrategy == "JsonIn" && method == "DELETE") {
            //Simplesmente chame o web service DELETE, com o json dos campos de entrada!              
            var camposFormObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" : theFieldArray.in.camposFormObjeto;
            var camposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.camposObjeto;
            var tipoCamposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.tipoCamposObjeto;
            var theJson = camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto);
            
            call_DELETE_JSON_PURA_TOKEN_WITH_DATA(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Excluído com sucesso!");
                $('#' + divMolde).dialog("close");
            }).catch((err) => {
                alert("Problemas na Exclusão!" + err);
                $('#' + divMolde).dialog("close");
            });
        }        
        else if (bindingStrategy == "JsonTipoDadosIn" && method == "POST") {            
            //Simplesmente chame o web service POST, com o json dos campos de entrada! (no modelo tipo, dados...)
            //{'tipo': 'valorTipo','dados'{JSON da entidade!}}                 
            var nomeEntidade = theFieldArray.bindingParameters.nomeEntidade;
            var camposFormObjeto = theFieldArray.in.camposFormObjeto;
            var camposObjeto = theFieldArray.in.camposObjeto;
            var tipoCamposObjeto = theFieldArray.in.tipoCamposObjeto;
            var theJson = camposToJSONId(nomeEntidade, camposFormObjeto, camposObjeto, tipoCamposObjeto);           

            call_POST_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Gravado com sucesso!");
                $('#' + divMolde).dialog("close");

            }).catch((err) => {
                alert("Problemas na Gravação!" + err);
                $('#' + divMolde).dialog("close");
            });

        }        
        else if (bindingStrategy == "JsonIn" && method == "PUT") {
            //Simplesmente chame o web service PUT, com o json dos campos de entrada!                
            var camposFormObjeto = theFieldArray.in.camposFormObjeto;
            var camposObjeto = theFieldArray.in.camposObjeto;
            var tipoCamposObjeto = theFieldArray.in.tipoCamposObjeto;
            var theJson = camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto);

           
            call_PUT_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Gravado com sucesso!");
                $('#' + divMolde).dialog("close");

            }).catch((err) => {
                alert("Problemas na Gravação!" + err);
                $('#' + divMolde).dialog("close");
            });
        }
        else if (bindingStrategy == "JsonTipoDadosIn" && method == "PUT") {
            //Simplesmente chame o web service PUT, com o json dos campos de entrada! (no modelo tipo, dados...)
            //{'tipo': 'valorTipo','dados'{JSON da entidade!}}                 
            var nomeEntidade = theFieldArray.bindingParameters.nomeEntidade;
            var camposFormObjeto = theFieldArray.in.camposFormObjeto;
            var camposObjeto = theFieldArray.in.camposObjeto;
            var tipoCamposObjeto = theFieldArray.in.tipoCamposObjeto;
            var theJson = camposToJSONId(nomeEntidade, camposFormObjeto, camposObjeto, tipoCamposObjeto);

            

            call_PUT_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Gravado com sucesso!");
                $('#' + divMolde).dialog("close");

            }).catch((err) => {
                alert("Problemas na Gravação!" + err);
                $('#' + divMolde).dialog("close");
            });
        }
        else if (bindingStrategy == "SimpleId" && method == "DELETE") {
            //Simplesmente concatene com a string da url o valor dos camposFormObjeto, concatenados por "_"
            var auxLen = camposFormObjeto.length;
            var myUrl = urlApi;
            for (let i = 0; i < auxLen; i++) {
                myUrl += $(camposFormObjeto[i]).val();
            }

          
            call_DELETE_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), this.myToken, '/myToken').then((data) => {
                alert("Sucesso!", "Gravado com sucesso!");
                $('#' + divMolde).dialog("close");

            }).catch((err) => {
                alert("Problemas na Remoção!" + err);
                $('#' + divMolde).dialog("close");
            });
        }
        else if(bindingStrategy == "JsonInJsonOut" && method == "POST"){
              //Simplesmente chame o web service GET, com o json dos campos de entrada!  
            
              var camposFormObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" : theFieldArray.in.camposFormObjeto;
              var camposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.camposObjeto;
              var tipoCamposObjeto = (theFieldArray.in == null || theFieldArray.in == "") ? "" :theFieldArray.in.tipoCamposObjeto;
              var theJson = camposToJSONIdPlain(camposFormObjeto, camposObjeto, tipoCamposObjeto);
  
              call_POST_JSON_PURA_TOKEN(urlApi, JSON.stringify(theJson), 
                                                this.myToken, '/myToken').then((data) => {
                    var theArray = data;
                    var outValues = theArray;
                    var auxS = this.getMoldeCadastro(theFieldArray, "out", divMolde, theWebApiIndex);
                    $('#' + divMolde).html(auxS);
                    this.preencheMoldeCadastro(theFieldArray.out, outValues);
                    this.dialogReposition(divMolde);
               }).catch((err) => {
                alert("Ocorreu um erro:" + err);
               });

        }
    }
      
    getMoldeCadastro(fieldArray, inOut, divMolde, theIndex) {
        
        var myhtml = super.getMoldeCadastro(fieldArray, inOut, divMolde, theIndex);

        if (inOut == 'in') {
            var MoldeAPI_btnChamar = divMolde + "_MoldeAPI_btnChamar";

            myhtml += '<button id="' + MoldeAPI_btnChamar + '" type="button" class="btn btn-primary">' + fieldArray.nomeBotao + '</button>';
            myhtml += '<script>$(document).ready(function () {' +
                ' $("#' + MoldeAPI_btnChamar + '").click(function () {' +
                '     ' + this.myVarName + '.MoldeAPI_chamarWS("' + divMolde + '", ' + theIndex + '); ' +
                ' });' +
                '});' +
                '\<\/script>';
        }
        else if (inOut == 'out') {
            var MoldeAPI_btnOK = divMolde + "_MoldeAPI_btnOK";
            myhtml += '<button id="' + MoldeAPI_btnOK + '" type="button" class="btn btn-primary">OK</button>' +
                '<script>$(document).ready(function () {' +
                ' $("#' + MoldeAPI_btnOK + '").click(function () {' +
                ' $("#' + divMolde + '").dialog("close");' +
                ' });' +
                '});' +
                '\<\/script>'
                ;
        }

        return myhtml;

    }
    
    preencheMoldeCadastro(fieldArray, theValues) { 
        
        var camposObjeto = fieldArray.camposObjeto;
        var camposFormObjeto = fieldArray.camposFormObjeto;
        var tipoCamposObjeto = fieldArray.tipoCamposObjeto;
        var auxLen = fieldArray.camposObjeto.length
        for (let i = 0; i < auxLen; i++) {
            if (tipoCamposObjeto[i] == "boolean") {
                setValueCB(camposFormObjeto[i].replace("#", ""), resultToField(theValues[camposObjeto[i]], tipoCamposObjeto[i]));
            }
            else if(tipoCamposObjeto[i] == "tinymce"){
                let auxContent = resultToField(theValues[camposObjeto[i]], tipoCamposObjeto[i]);
                tinymce.remove();
                initTinyMCE(camposFormObjeto[i],auxContent);
            }  
            else if(tipoCamposObjeto[i] == 'base64'){
                let auxContent = resultToField(theValues[camposObjeto[i]], tipoCamposObjeto[i]);                
                initBase64(camposFormObjeto[i],auxContent);
            }          
            else {
                $(camposFormObjeto[i]).val(resultToField(theValues[camposObjeto[i]], tipoCamposObjeto[i]));
            }
            
        }
    }

    set_arrayParameters_MWAPI(theArray) {
        super.set_arrayParameters_MWAPI(theArray);

        
        var auxArray = theArray.webapiDialogs[this.WebApiIndex];
        var myDiv = this.myMainDivName(this.WebApiIndex);       

  
        if (auxArray.bindingStrategy == "ListPageFilter") {              
            this.myChooser = new GenericChooser(this.urlJsonFile,this.formId,this.myVarName + ".myChooser");
            this.myChooser.fullArrayParameters = theArray; 
            this.myChooser.myToken = this.myToken;
            this.myChooser.loadNewChooser(auxArray.id, this.formId.replace("#",""), "", "");
        }
        else {           

            $(this.formId).append("<div id='" + myDiv + "'/>");

            var smetrics = this.getScreenMetrics();

            $("#" + myDiv).dialog({
                //position: { my: "center", at: "center", collision:"fit" },
                position: { my: smetrics['pmy'], at: smetrics['pat'], of: smetrics['pof'], collision: smetrics['pcollision'] },
                /*minHeight: 480,
                maxHeight: 800,
                minWidth: 600,*/
                minHeight: smetrics['minh'],
                maxHeight: smetrics['maxh'],
                minWidth: smetrics['minw'],
                autoOpen: false,
                close: function () {
                    $("#" + myDiv).remove();
                }
            });




            var auxS = this.getMoldeCadastro(auxArray, "in", myDiv, this.WebApiIndex);

            $("#" + myDiv).html(auxS);
            $("#" + myDiv).dialog("option", "title", auxArray.nome);
            $("#" + myDiv).dialog("open");
        }
    }

}


class GenericCRUD extends GenericDialog {
    constructor(theJsonFile, theFormId, theFormShowId, theFormIdChooser, theFormShowIdChooser, theTitleIdChooser,_myVarName) {

        super(theJsonFile, theFormId, _myVarName);

        this.formShowId = theFormShowId;
        this.formIdChooser = theFormIdChooser;
        this.formShowIdChooser = theFormShowIdChooser;
        this.titleIdChooser = theTitleIdChooser;
        this.camposFormObjeto = null;
        this.camposObjeto = null;
        this.tipoCamposObjeto = null;
        this.chooseFormObjeto = null;
        this.urlObter = null;
        this.urlApagar = null;
        this.urlObter = null;
        this.urlApagar = null;
        this.urlLoadObjetos = null;
        this.urlCount = null;
        this.urlIncluir = null;
        this.urlAlterar = null;
        this.camposFormObjeto = null;
        this.labelsFormObjeto = null;
        this.readOnlyFormObjeto = null;
        this.Defaults = null;
        this.inputFieldFormObjeto = null;      
        this.campoObjetoId = null;
        this.camposListagemObjeto = null;
        this.camposFormClassObjeto = null;
        this.nomeEntidade = null;
        this.accordions = null;
        this.camposFormObjetoOrder = null;        
        this.pagina = 1;
        this.pageSize = 4;
        this.maxPagina = 10000;
        this.count = -1;
        this.seApaga = 0;
        this.seSaiuModal = 0;
        this.idObjeto = 0;
        this.filtro = "";
        this.WebApiIndex = -1;              
    }
      
    

    set_arrayParameters_MWAPI(theArray) {
        super.set_arrayParameters_MWAPI(theArray);
        

        //var theurlBase = this.fullArrayParameters.Confs.urlBase;   
        
        
        //Adaptações de GenericCRUD
        var auxJson = this.fullArrayParameters.entities;
        let theurlBase = this.get_urlBase(auxJson[this.WebApiIndex]); 

        this.urlObter = theurlBase + auxJson[this.WebApiIndex].urlObter;
        this.urlApagar = theurlBase +  auxJson[this.WebApiIndex].urlApagar;
        this.urlLoadObjetos = theurlBase + auxJson[this.WebApiIndex].urlLoadObjetos;
        this.urlCount = theurlBase + auxJson[this.WebApiIndex].urlCount;
        this.urlIncluir = theurlBase + auxJson[this.WebApiIndex].urlIncluir;
        this.urlAlterar = theurlBase + auxJson[this.WebApiIndex].urlAlterar;
        this.camposFormObjeto = auxJson[this.WebApiIndex].camposFormObjeto;
        this.labelsFormObjeto = auxJson[this.WebApiIndex].labelsFormObjeto;
        this.readOnlyFormObjeto = auxJson[this.WebApiIndex].readOnlyFormObjeto;
        this.Defaults = auxJson[this.WebApiIndex].Defaults;
        this.inputFieldFormObjeto = auxJson[this.WebApiIndex].inputFieldFormObjeto;
        this.camposObjeto = auxJson[this.WebApiIndex].camposObjeto;
        this.campoObjetoId = auxJson[this.WebApiIndex].campoObjetoId;
        this.camposListagemObjeto = auxJson[this.WebApiIndex].camposListagemObjeto;
        this.camposFormClassObjeto = auxJson[this.WebApiIndex].camposFormClassObjeto;
        this.nomeEntidade = auxJson[this.WebApiIndex].nomeEntidade;
        this.nome = auxJson[this.WebApiIndex].nome;
        this.tipoCamposObjeto = auxJson[this.WebApiIndex].tipoCamposObjeto;
        this.chooseFormObjeto = auxJson[this.WebApiIndex].chooseFormObjeto;
        this.accordions = auxJson[this.WebApiIndex].accordions;
        this.IdToView = auxJson[this.WebApiIndex].IdToViewObjeto;
        this.camposFormObjetoOrder = auxJson[this.WebApiIndex].camposFormObjetoOrder;

        //Vamos criar elementos html

        this.createHtmlElement();

        $("#" + this.myDiv()).dialog("option", "title", this.nome);
        $("#" + this.myDiv()).dialog("open");
           
    }


    async actionSucessObter(result) {                
        var auxLen = this.camposFormObjeto.length;
        for (var i = 0; i < auxLen; i++) {        

            if (this.tipoCamposObjeto[i] == "boolean") {
                setValueCB(this.camposFormObjeto[i].replace("#",""), resultToField(result[this.camposObjeto[i]], this.tipoCamposObjeto[i]));
            }
            else if(this.tipoCamposObjeto[i] == "tinymce"){
                let auxContent = resultToField(result[this.camposObjeto[i]], this.tipoCamposObjeto[i]);
                tinymce.remove();
                initTinyMCE(this.camposFormObjeto[i],auxContent);   
            }
            else if(this.tipoCamposObjeto[i]=="base64"){
                let auxContent = resultToField(result[this.camposObjeto[i]], this.tipoCamposObjeto[i]);                
                initBase64(this.camposFormObjeto[i],auxContent); 
            }
            else {
                $(this.camposFormObjeto[i]).val(resultToField(result[this.camposObjeto[i]], this.tipoCamposObjeto[i]));
            }

            if (this.chooseFormObjeto[i] != "") {                                
                var auxS = this.camposFormObjeto[i];
                var auxArray = this.fullArrayParameters.entities[this.WebApiIndex].IdToViewObjeto;                
                var auxS2 = (auxArray == null || auxArray == "") ? "" : auxArray[i];
                if (auxS != "" && auxS2 != "") {                    
                    var idObjetoDetalhe = $(auxS).val();
                    if (idObjetoDetalhe != null && idObjetoDetalhe != "") {
                        ////console.log(`Vou chamar this.LoadListagemObjeto(this.urlJsonFile,${auxS2},${idObjetoDetalhe},${this.camposFormObjeto[i] + "_view"});`);
                        //var auxDetalhe = await this.LoadListagemObjeto(this.urlJsonFile, auxS2, idObjetoDetalhe, this.camposFormObjeto[i] + "_view");
                        ////console.log(`Vou chamar this.LoadListagemObjeto(${auxS2},${idObjetoDetalhe},${this.camposFormObjeto[i] + "_view"});`);
                        var auxDetalhe = await this.LoadListagemObjeto(auxS2, idObjetoDetalhe, this.camposFormObjeto[i] + "_view",true);

                        ////console.log(`--> Resultou em : ${auxDetalhe}`);
                    }                    
                }
            }

        }
    }

    actionSucessLoadObjetos(result) {   
        this.getMoldeListagemMelhorado(result, this.camposListagemObjeto,this.camposObjeto,this.tipoCamposObjeto, this.campoObjetoId, this.IdToView);
        
        $('#' + this.idName("lg")).show();
    }
        
    actionApagaCampos() {
        var auxLen = this.camposFormObjeto.length;
        for (var i = 0; i < auxLen; i++) {
            if(this.Defaults === undefined){
                $(this.camposFormObjeto[i]).val("");
            }
            else{
                let auxDefault = this.Defaults[i];
                auxDefault = (auxDefault !== undefined || auxDefault != null)? auxDefault:"";
                $(this.camposFormObjeto[i]).val(auxDefault);
            }
            

            if (this.chooseFormObjeto[i] != "") {
                $(this.camposFormObjeto[i] + "_view").val("");
            }

        }
    }

    LoadObjeto(idObjeto) {
        //console.log('->LoadMolde(\n\t[');
        var theurl = this.urlObter + this.idObjeto;
        var myPromise = call_GET_JSON_PURA_TOKEN(theurl, this.myToken, "/myToken");
        myPromise.then((data) => {
            this.actionSucessObter(data);
        }).catch((err) => {
            //$('#' + this.idName("titleModalInformacao")).text("Falha!");
            //$('#' + this.idName("textoModalInformacao")).text("LoadObjeto(idObjeto):Problemas para carregar informações do Objeto clicado!");
            //$('#' + this.idName("modalInformacao")).modal();
            this.showMensagem("Falha!", "LoadObjeto(idObjeto):Problemas para carregar informações do Objeto clicado!");
        });
    }

    createHtmlScriptMiniCRUD(theDeForm, thePara, entitiyName, theButtonId) {
        /*
        * //(theJsonFile, theFormId, theFormShowId, theFormIdChooser, theFormShowIdChooser, theTitleIdChooser, _myVarName)*/
       

        
       
        var theValueField = $(theDeForm).val();
        var myFixedFilter1 = '{"' + thePara + ':"CalcObjectID(' + "'";
        var myFixedFilter2 = "')" + '"}';

        if (this.arrayCaminhoId == null) {
            this.geraCaminhoIds();
        }
        var auxIndex1 = this.arrayCaminhoId[entitiyName];
        var auxIndex2 = getIdJsonElementFromString(auxIndex1);

        var auxScript = "";
        auxScript +=
            //this.myVarName + '.myGenericCRUD = new GenericCRUD(' +
            
            this.myVarName + '.myGenericCRUD = new miniCRUD(' +
            this.myVarName + '.urlJsonFile,' +
            this.myVarName + '.formId,"#myFormBar",' +
            '"' + this.idName("myChooser") + '",' +
            '"' + this.idName("myChooserForm") + '",' +
            '"' + this.idName("myChooserTitle") + '",' +
            '"' + this.myVarName + '.myGenericCRUD");\n' +
            'var theVal = $("' + theDeForm + '").val();\n' +
            'var theVal2 = "CalcObjectID(\'" + theVal + "\')";\n' +
            //"theVal2 ='{\"
        this.myVarName + ".myGenericCRUD.fixedFieldValue ='{\"" + thePara + "\":\"' + theVal2 + '\"}';\n" +
            this.myVarName + '.myGenericCRUD.fullArrayParameters =' + this.myVarName + '.fullArrayParameters;\n' +
            this.myVarName + '.myGenericCRUD.loadMolde(' + auxIndex2 + ');\n' +
            this.myVarName + '.myGenericCRUD.myToken = ' + this.myVarName + '.myToken;\n';

        ////console.log(auxScript);

        auxScript = '<script> $("#' + theButtonId + '").click('
            + '     function () {'
            + auxScript
            + '     });'
            + '\<\/script> '

        return auxScript;
    }

    createHtmlMiniCRUDs() {

        var auxHtml = "";
        var miniCrudsArray = this.fullArrayParameters.entities[this.WebApiIndex].minicrud;
        if (miniCrudsArray != null & miniCrudsArray != "" && Array.isArray(miniCrudsArray)) {
            for (let k = 0; k < miniCrudsArray.length; k++) {
                //Cada minicrud gera um botão verde!
                //{"rotuloInterface":"Perfis","entity":"CadastrarPerfilUsuarioE","De":"UsuarioId","Para":"Usuario"}
                var rotuloInterface = miniCrudsArray[k]['rotuloInterface'];
                var theEntity = miniCrudsArray[k]['entity'];
                var thePara = miniCrudsArray[k]['Para'];
                var theDeForm = miniCrudsArray[k]['DeForm'];
                

                auxHtml += '<button id="' + this.idName(theEntity) + '" type = "button" class="btn btn-success" >' +
                    rotuloInterface + '</button>';

                var myScript = this.createHtmlScriptMiniCRUD(theDeForm, thePara, theEntity, this.idName(theEntity));

                auxHtml += myScript;
            }
        }
        return auxHtml;
    }


    apaga(idObjeto) {
        var theurl = this.urlApagar + this.idObjeto;
        //var myPromise = call_DELETE_JSON_PROMISE_PURA(theurl);
        var myPromise = call_DELETE_JSON_PURA_TOKEN(theurl,this.token,'/myToken');

        myPromise.then((data) => {
            this.LoadObjetos();
        }).catch((err) => {
            //$('#' + this.idName("titleModalInformacao")).text("Falha!");
            //$('#' + this.idName("textoModalInformacao")).text("Não deu certo! Não apagou!");
            //$('#' + this.idName("modalInformacao")).modal(); 
            this.showMensagem("Falha!", "Não deu certo! Não apagou!");
        });        
    }

    LoadObjetos() { 
        this.countObjeto(this.myToken, "/myToken");

        $('#' + this.idName("lg")).html("");

        var auxFilter = this.geraFiltro(this.filtro, this.camposListagemObjeto);
        var theurl = this.urlLoadObjetos + this.pageSize + '&page=' + this.pagina + '&filtro=' + encodeURIComponent(auxFilter);        
        var myPromise = call_GET_JSON_PURA_TOKEN(theurl, this.myToken, "/myToken");

        myPromise.then((data) => {
            this.actionSucessLoadObjetos(data);
        }).catch((err) => {
            this.showMensagem("Falha!", "LoadObjetos():Problemas para carregar informações dos Objetos!");
        });

    }

    countObjeto(token,urlToken) {
        var auxurlCount = this.urlCount;
        
        $('#' + this.idName("lg")).html("");
        var myPromise = call_GET_JSON_PURA_TOKEN(auxurlCount, this.myToken, "/myToken");


        myPromise.then((data) => {
            var count = data;
            this.maxPagina = count / this.pageSize;
            this.maxPagina = Math.ceil(this.maxPagina);

        }).catch((err) => {
            $('#' + this.idName("titleModalInformacao")).text("Falha!");
            $('#' + this.idName("textoModalInformacao")).text("Não deu certo! Não conseguiu contar!");
            $('#' + this.idName("modalInformacao")).modal();        
        });
        
    }

    ApagaCampos() {
        this.actionApagaCampos();
    }

    showMensagem(titulo, informacao) { 

        $('#'+this.idName("textoModalInformacaoWithDialog")).text(informacao);
        $('#' + this.idName("modalWithDialog")).dialog({
            closeText: "OK",
            title: titulo
        });
    }

    showConfirm(titulo, informacao) {
        return confirm(informacao);
    }

    Incluir() {
        
        var theJsonAux = camposToJSONId(this.nomeEntidade, this.camposFormObjeto, this.camposObjeto, this.tipoCamposObjeto);  

        //var myPromise = call_POST_JSON_PROMISE_PURA(this.urlIncluir, JSON.stringify(theJsonAux));
        var myPromise = call_POST_JSON_PURA_TOKEN(this.urlIncluir, JSON.stringify(theJsonAux), this.myToken, '/myToken');

        myPromise.then((data) => {            
            this.ApagaCampos();
            this.LoadObjetos();
            $('#' + this.idName("novoRegistro")).hide();
            $('#' + this.idName("lista")).show();
            $('#' + this.idName("lg")).html("");
            this.showMensagem("Sucesso!", "Gravado com sucesso!");

        }).catch((err) => {
            $('#lg').html("");
            //$("#titleModalInformacao").text("Falha!");
            //$("#textoModalInformacao").text("Problemas na Gravação!");
            //$("#modalInformacao").modal();
            this.showMensagem("Falha!", "Problemas na Gravação!");
        });


    }

    Alterar() {        

        
        var theJsonAux = camposToJSONId(this.nomeEntidade, this.camposFormObjeto, this.camposObjeto, this.tipoCamposObjeto);
        //var myPromise = call_PUT_JSON_PROMISE_PURA(this.urlAlterar, JSON.stringify(theJsonAux));
        var myPromise = call_PUT_JSON_PURA_TOKEN(this.urlAlterar, JSON.stringify(theJsonAux),this.myToken,'/myToken');

        myPromise.then((data) => {
            this.ApagaCampos();
            this.LoadObjetos();
            $('#' + this.idName("novoRegistro")).hide();
            $('#' + this.idName("lista")).show();
            $('#' + this.idName("lg")).html("");
            this.showMensagem("Sucesso!", "Gravado com sucesso!");
            

        }).catch((err) => {
            $('' + this.idName("#lg")).html("");
            this.showMensagem("Falha!", "Problemas na Gravação!");
        
        });

        
    }

    getMoldeCadastro(fieldArray, inOut, divMolde, theIndex) {
        var theHtml = super.getMoldeCadastro(fieldArray, inOut, divMolde, theIndex);

        theHtml += '<button id="' + this.idName("btnLista") + '" type="button" class="btn btn-primary">Índice</button>' +
                '<button id="' + this.idName("btnGravar") + '" type="button" class="btn btn-primary">Gravar</button>' +
            '<button id="' + this.idName("btnRemover") + '" type="button" class="btn btn-primary">Remover</button>';
        theHtml += this.createHtmlMiniCRUDs(); 
        
        return theHtml;

    }

    createHtmlBusca() {
        var auxHtml = "";
        auxHtml += '<form class="form-inline mx-auto" action="#" id="' + this.idName(" busca") + '" > ' +
            '            <div class="row">' +
            '                <div class="col">' +
            '                    <label for="filtro">Busca:</label>' +
            '                </div>' +
            '                <div class="col">' +
            '                    <input type="text" class="form-control" id="' + this.idName("filtro") + '" />' +
            '                </div>' +
            '                <div class="col">' +
            '                    <button type="button" class="btn btn-primary" id="' + this.idName("btFiltra") + '"><img src="/svg/search-24px.svg" /></button>' +
            '                </div>' +
            '            </div>' +
            '        </form>';
        return auxHtml;
    }

    createHtmlNavigation() {    
        
        return '<ul class="pagination mx-auto">' +
            '            <li id="' + this.idName("FirstPageBtn") + '" class="page-item"><a class="page-link" href="#"><img src="/svg/first_page-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("LeftPageBtn") + '" class="page-item"><a class="page-link" href="#"><img src="/svg/chevron_left-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("RightPageBtn") + '" class="page-item"><a class="page-link" href="#"><img src="/svg/chevron_right-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("LastPageBtn") + '" class="page-item"><a class="page-link" href="#"><img src="/svg/last_page-24px.svg" /></a></li>' +
            '</ul>';        
    }

    createHtmlAdicionar() {        
        return '<button id="' + this.idName("btnNova") + '" type="button" class="btn btn-primary">Adicionar</button>';
    }

    createHtmlListGroup() {
        return '<br/><div class="list-group" id="' + this.idName("lg") + '"></div><br/>';
    }


    createHtmlLista() {
        var aux = "";
        aux +=
            '<div id="' + this.idName("lista") + '">' +
                this.createHtmlBusca() +
                this.createHtmlListGroup() +
                this.createHtmlNavigation() +                
                this.createHtmlAdicionar() +
                //this.createHtmlMiniCRUDs()+
            '</div>';
        return aux;
    }

    createHtmlNovoRegistroDiv() {        
        return '<div id="' + this.idName("novoRegistro") + '"><form action="#" id="' + this.idName("moldeCadastro") + '"></form></div>';        
    }

    createHtmlListagem() {        
        return '<div id="' + this.idName("cadastro") + '">' + this.createHtmlNovoRegistroDiv() + this.createHtmlLista() +  '</div>';        
    }

    createHtmlConfirmacaoApagarModal() {
        return '<div id="' + this.idName("confirmacaoApagar") + '" class="modal">' +
            '    <div class="modal-dialog modal-dialog-centered">' +
            '        <div class="modal-content">' +
            '            <!-- Modal Header -->' +
            '            <div class="modal-header">' +
            '                <h4 class="modal-title">Alerta!</h4>' +
            '                <button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '            </div>' +
            '            <!-- Modal body -->' +
            '            <div class="modal-body">' +
            '                <h2>Você tem certeza que deseja apagar?</h2>' +
            '            </div>' +
            '            <!-- Modal footer -->' +
            '            <div class="modal-footer">' +
            '                <button id="' + this.idName("okApagabtn") + '" type="button" class="btn btn-danger" data-dismiss="modal">OK</button>' +
            '                <button id="' + this.idName("cancelApagabtn") + '" type="button" class="btn btn-danger" data-dismiss="modal">CANCELAR</button>' +
            '            </div>' +
            '        </div>' +
            '    </div>' +
            '</div>';
    }

    createHtmlModalInformacao() {
        return '<div id="' + this.idName("modalInformacao") + '" class="modal">' +
            '    <div class="modal-dialog modal-dialog-centered">' +
            '        <div class="modal-content">' +
            '            <!-- Modal Header -->' +
            '<div class="modal-header">' +
            '                <h4 id="' + this.idName("titleModalInformacao") + '" class="modal-title">Informação:</h4>' +
            '                <button type="button" class="close" data-dismiss="modal">&times;</button>' +
            '            </div>' +
            '<!-- Modal body -->' +
            '<div class="modal-body">' +
            '                <h2 id="' + this.idName("textoModalInformacao") + '">Informação</h2>' +
            '            </div>' +
            '<!-- Modal footer -->' +
            '<div class="modal-footer">' +
            '    <button id="' + this.idName("okModalInformacao") + '" type="button" class="btn btn-danger" data-dismiss="modal">OK</button>' +
            '            </div>' +
            '        </div>' +
            '    </div>' +
            '</div>' +
            '<div id="' + this.idName("modalWithDialog") + '">' +
            '    <h2 id="' + this.idName("textoModalInformacaoWithDialog") + '" />' +
            '</div>';
    }

    createHtmlElements1(theDiv) {
        var myHtml = "";
        myHtml +=
            this.createHtmlListagem() +
            this.createHtmlConfirmacaoApagarModal() +
            this.createHtmlModalInformacao();     

        $("#" + theDiv).append(myHtml);
    }

    createHtmlScriptbtnGravar() {
        var aux = "";
        aux +=   '    $("#' + this.idName("btnGravar") + '").click(function () {' +
            '        if ( ' + this.myVarName + '.idObjeto == 0) {' +
            '            ' + this.myVarName + '.Incluir();' +
            '        }' +
            '        else {' +
            '            ' + this.myVarName + '.Alterar();' +
            '        }' +
            '    });';
        return aux;
    }

    createHtmlScriptbtNova() {
        var auxidObjeto = this.myVarName + ".idObjeto";
        var auxApagaCampos = this.myVarName + ".ApagaCampos";

        return '    $("#' + this.idName("btnNova") + '").click(function () {' +
            '        ' + auxidObjeto + ' = 0;' +
            '        ' + auxApagaCampos + '();' +
            '        $("#' + this.idName("novoRegistro") + '").show();' +
            '        $("#' + this.myDiv() + '").parent().position({my:"center",at:"center",of:window});' +
            '        $("#' + this.idName("lista") + '").hide();' +
            '    });';
    }

    createHtmlScriptbtnLista() {
        return '    $("#' + this.idName("btnLista") + '").click(function () {' +
            //aaa'        $(' + this.myVarName + '.formId).css("height", 300);' +
            '        $("#' + this.idName("novoRegistro") + '").hide();' +
            '        $("#' + this.idName("lista") + '").show();' +
            '        $("#' + this.myDiv() + '").parent().position({my:"center",at:"center",of:window});' +
            '        var auxwidth = $(' + this.myVarName + '.formId).width();' +
            '        var auxheight = $(' + this.myVarName + '.formId).height();' +
            '        $(' + this.myVarName + '.formId).css("height", auxheight);' +
            '    });';
    }

    createHtmlScriptbtnRemover() {
        return '    $("#' + this.idName("btnRemover") + '").click(function () {' +
            '            var seApaga = ' + this.myVarName + '.showConfirm("Apagar", "Você tem certeza?");' +
            '            if(seApaga == true){' +
            '               $("#' + this.idName("novoRegistro") + '").hide(); ' +
            '               $("#' + this.idName("lista") + '").show();' +
            '               ' + this.myVarName + '.apaga(' + this.myVarName + '.idObjeto);' +
            '                   ' + this.myVarName + '.showMensagem("Apagado!","Apagado com sucesso!");' +
            '            }' +
            '    });';
    }

    createHtmlScriptRightPagebtn() {
        return '    $("#' + this.idName("RightPageBtn") + '").click(function () {' +
            '        if (' + this.myVarName + '.pagina < ' + this.myVarName + '.maxPagina) {' +
            '            ' + this.myVarName + '.pagina = ' + this.myVarName + '.pagina + 1;' +
            '            ' + this.myVarName + '.LoadObjetos();' +
            '        }' +
            '    });';
    }

    createHtmlScriptLeftPagebtn() {
        return '    $("#' + this.idName("LeftPageBtn") + '").click(function () {' +
            '        if (' + this.myVarName + '.pagina > 1) {' +
            '            ' + this.myVarName + '.pagina = ' + this.myVarName + '.pagina - 1;' +
            '            ' + this.myVarName + '.LoadObjetos();' +
            '        }' +
            '    });';
    }

    createHtmlScriptbtFiltra() {
        return '    $("#' + this.idName("btFiltra") + '").click(function () {' +
            '        ' + this.myVarName + '.filtro = $("#' + this.idName("filtro") + '").val();' +
            '        ' + this.myVarName + '.pagina = 1 ;' +
            '        ' + this.myVarName + '.LoadObjetos();' +
            '    });';
    }
    createHtmlScriptFirstPagebtn() {
        return '    $("#' + this.idName("FirstPageBtn") + '").click(function () {' +
            '        ' + this.myVarName + '.pagina = 1;' +
            '        ' + this.myVarName + '.LoadObjetos();' +
            '    });';
    }

    createHtmlScriptLastPagebtn() {
        return '    $("#' + this.idName("LastPageBtn") + '").click(function () {' +
            '        if (' + this.myVarName + '.maxPagina != 10000) {' +
            '            ' + this.myVarName + '.pagina = ' + this.myVarName + '.maxPagina;' +
            '            ' + this.myVarName + '.LoadObjetos();' +
            '        }' +
            '    });';
    }

    createHtmlScriptOkApagabtn() {
        return '    $("#' + this.idName("okApagabtn") + '").click(function () {' +
            '        ' + this.myVarName + '.seApaga = 1;' +
            '        $("#' + this.idName("novoRegistro") + '").hide();' +
            '        $("#' + this.idName("lista") + '").show();' +
            '        ' + this.myVarName + '.apaga(' + this.myVarName + '.idObjeto);' +
            '    });';
    }

    createHtmlScriptCancelApagabtn() {
        return '    $("#' + this.idName("cancelApagabtn") + '").click(function () {' +
            '        ' + this.myVarName + '.seApaga = 0;' +
            '    });';
    }

    createHtmlScriptLgClick() {
        /*
         * $('#my-selector').parent().position({my:"center",at:"center",of:window});
         */
        return '    $("#' + this.idName("lg") + '").on("click", "a", function (event) {' +
            '       var theIndex = this.id.split("_")[this.id.split("_").length -1];\n' +
            '       var theId2 = ' + this.myVarName + ".arrayIdsListagem[theIndex];\n" +
            '        ' + this.myVarName + '.idObjeto = theId2;' +
            '        ' + this.myVarName + '.LoadObjeto(' + this.myVarName + '.idObjeto);' +            
            '        $("#' + this.idName("novoRegistro") + '").show();' + 
            '        $("#' + this.myDiv() + '").parent().position({my:"center",at:"center",of:window});' +
            '        $("#' + this.idName("lista") + '").hide();' +
            '    });';
    }


    createHtmlElements2(theDiv) {        
        this.WebApiIndex
        var auxDiv = this.myVarName + ".myDiv()";
        var auxIndex = this.myVarName + ".WebApiIndex";
        var auxFullArray = this.myVarName + ".fullArrayParameters.entities[" + auxIndex + "]";       
        var auxGetMoldeCadastro = this.myVarName + ".getMoldeCadastro(" + auxFullArray + ",'entity'," + auxDiv + "," + auxIndex + ")";
        var auxLoadObjetos = this.myVarName + ".LoadObjetos";
        var auxApagaCampos = this.myVarName + ".ApagaCampos";
        var auxidObjeto = this.myVarName + ".idObjeto";
        var myScripts = "";

        myScripts +=
            '<script>' +
            '$(document).ready(function () {' +
            '    $("#' + this.idName("novoRegistro") + '").hide();' +
            '    $("#' + this.idName("moldeCadastro") + '").html(' + auxGetMoldeCadastro + ');' +
            '    ' + auxLoadObjetos + '();' +
            this.createHtmlScriptbtnGravar() +
            this.createHtmlScriptbtNova() +
            this.createHtmlScriptbtnLista()+
            this.createHtmlScriptbtnRemover() +
            this.createHtmlScriptRightPagebtn()+
            this.createHtmlScriptLeftPagebtn() +
            this.createHtmlScriptbtFiltra()+
            this.createHtmlScriptFirstPagebtn() +
            this.createHtmlScriptLastPagebtn() +
            this.createHtmlScriptOkApagabtn() +
            this.createHtmlScriptCancelApagabtn() + 
            this.createHtmlScriptLgClick() +
            '});' +            
            '\<\/script> ';

        $("#" + theDiv).append(myScripts);
    }

    createHtmlElement() {
        //Criando divs etc ...
        var auxDiv = this.myDiv();

        $(this.formId).append("<div id='" + auxDiv + "'/>");

        var smetrics = this.getScreenMetrics();     
        
        $("#" + auxDiv).dialog({
            //position: { my: "center", at: "center", collision: "fit" },
            position: { my: smetrics['pmy'], at: smetrics['pat'], of: smetrics['pof'], collision: smetrics['pcollision'] },
            //minHeight: 480,
            minHeight: smetrics['minh'],
            //maxHeight: 800,
            maxHeight: smetrics['maxh'],
            //minWidth: 600,
            minWidth: smetrics['minw'],
            autoOpen: false,
            close: function () {
                $("#" + auxDiv).remove();
            }
        });




        
        this.createHtmlElements1(auxDiv);
        this.createHtmlElements2(auxDiv);

    }
}


class miniCRUD extends GenericCRUD {
    constructor(theJsonFile, theFormId, theFormShowId, theFormIdChooser, theFormShowIdChooser, theTitleIdChooser, _myVarName) {
        super(theJsonFile, theFormId, theFormShowId, theFormIdChooser, theFormShowIdChooser, theTitleIdChooser, _myVarName);
        this.fixedFieldValue = null;
    }

   

    geraFiltro(filtro, arrayListaCampos) {
         // '{field1:value1, field2:value2}' style, a json object o filtro de fixacao!
        var auxFilter = super.geraFiltro(filtro, arrayListaCampos);
        

        if (this.fixedFieldValue != null && this.fixedFieldValue != "") {
            var theJson = JSON.parse(this.fixedFieldValue);
            var keys = Object.keys(theJson);
            var values = Object.values(theJson);

            for (let i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = values[i];
                if (auxFilter != "" && auxFilter != null) {
                    auxFilter += '###';
                }
                auxFilter += 'eq;' + key + ';' + value;
            }
        }

        return auxFilter;

    }

    setFixedFieldValue(theFilter) {
        //theFilter = '{field1:value1, field2:value2}' style, a json object
        this.fixedFieldValue = theFilter;
    }

    createHtmlListGroup() {
        return '<div class="list-group" id="' + this.idName("lg") + '"></div>';
    }


    createHtmlAdicionar() {
        return '<ul class="pagination pagination-sm mx-auto">' +
            '            <li id="' + this.idName("btnNova") + '" class="page-item"><a class="page-link" href="#"><img  width="50%" src="/svg/add-24px.svg"/></a></li>' +
             '</ul>';

//        return '<button id="' + this.idName("btnNova") + '" type="button" class="btn btn-primary btn-sm"><img src="/svg/add-24px.svg"/></button>';
    }

    createHtmlBusca() {
        var auxHtml = "";
      

        auxHtml +=
        '<ul class="pagination pagination-sm mx-auto">' +
        '   <li class="page-item"><input type="text" hidden size="4" class="form-control form-control-sm" id="' + this.idName("filtro") + '"/></li>'+
        '   <li id="' + this.idName("btFiltra") + '" class="page-item"><a class="page-link" href="#"><img  width="50%" src="/svg/search-24px.svg"/></a></li>' +
        '   <li id="' + this.idName("btFixaCampo") + '" class="page-item"><a class="page-link" href="#"><img  width="50%" src="/svg/filter_alt-24px.svg"/></a></li>' +

            '</ul>';



        return auxHtml;
    }


    createHtmlLista() {
        var aux = "";
        aux +=
            '<div id="' + this.idName("lista") + '">' +
            '   <form class="form-inline mx-auto" action="#" id="' + this.idName(" busca") + '" > ' +
            '            <div class="row">' +
//            '                <div class="col">' +
                                this.createHtmlNavigation() +
//            '                </div>' +
//            '                <div class="col">' +
                                this.createHtmlAdicionar() +
            //'                </div>' +
                            this.createHtmlBusca() +  
            '            </div>' +
            '   </form>' +  
                this.createHtmlListGroup() +  
            '</div>';
        return aux;
    }

    createHtmlNavigation() {

        return '<ul class="pagination pagination-sm mx-auto">' +
            '            <li id="' + this.idName("FirstPageBtn") + '" class="page-item"><a class="page-link" href="#"><img width="50%" src="/svg/first_page-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("LeftPageBtn") + '" class="page-item"><a class="page-link" href="#"><img width="50%"  src="/svg/chevron_left-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("RightPageBtn") + '" class="page-item"><a class="page-link" href="#"><img width="50%"  src="/svg/chevron_right-24px.svg" /></a></li>' +
            '            <li id="' + this.idName("LastPageBtn") + '" class="page-item"><a class="page-link" href="#"><img width="50%"  src="/svg/last_page-24px.svg" /></a></li>' +
            '</ul>';
    }

    createHtmlScriptbtFiltra() {

        var aux =
            '    $("#' + this.idName("btFiltra") + '").click(function () {' +
            '           var theFilter = prompt("Digite o valor a buscar", "");' +
            '        ' + this.myVarName + '.filtro = theFilter; ' +
            '        ' + this.myVarName + '.pagina = 1 ;' +
            '        ' + this.myVarName + '.LoadObjetos();' +
            '    });' +
            '    $("#' + this.idName("btFixaCampo") + '").click(function () {' +
            '           var theFilter = prompt("Digite o valor a fixar", "");' +
            '        ' + this.myVarName + '.setFixedFieldValue(theFilter); ' +
            '        ' + this.myVarName + '.pagina = 1 ;' +
            '        ' + this.myVarName + '.LoadObjetos();' +
            '    });';


        return aux;
    }

    htmlLgItemElement(theText) {
        return '<small>' + theText +  '</small>';
    }

    createHtmlElement() {
        //Criando divs etc ...
        var auxDiv = this.myDiv();

        $(this.formId).append("<div id='" + auxDiv + "'/>");

        var smetrics = this.getScreenMetrics();


        $("#" + auxDiv).dialog({
            //position: { my: "center", at: "center", collision: "fit" },
            position: { my: smetrics['pmy'], at: smetrics['pat'], of: smetrics['pof'], collision: smetrics['pcollision'] },
            //minHeight: 480,
            //maxHeight: 800,
            maxHeight: smetrics['maxh'],
            //minWidth: 600,
            autoOpen: false,
            close: function () {
                $("#" + auxDiv).remove();
            }
        });



        this.createHtmlElements1(auxDiv);
        this.createHtmlElements2(auxDiv);

    }

}



    

