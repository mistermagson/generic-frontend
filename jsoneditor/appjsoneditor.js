const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const dictPath = './dict/';
const server_key = 'server_key.pem';
const server_cert = 'server_cert.pem';
const https = require('https');
const optsHttps = {
    key: fs.readFileSync(server_key)
    , cert: fs.readFileSync(server_cert)
}


//------------ Portas e endereços
const myconfsFile = 'confsApp.json';
const myconf = JSON.parse(fs.readFileSync(myconfsFile));

const portDataApp = myconf['portDataApp'];

const urlAppData = myconf['urlAppData'];

//------------- Portas e endereços
const port = portDataApp;
const urlApp = urlAppData + "/";

const app = express();

//---------- No cache! ----
const nocache = require('nocache');
const { isArray } = require('util');
app.use(nocache());
//----------- No cache! fim ---

app.use(cors()); //Habilita cors para todas as origens - No futuro, fazer restrições por origem!
//Sessões ---
app.use(cookieParser());
app.use(session({ secret: "sdfjkqieiriqwe2341,,,adf-30%%@#$&" }));
//----

var jsonParser = bodyParser.json();

function fillBasicInterfaceJsonFromDict(jsonObj, myKey){    
    //Vou acessar o subobjeto a partir da chave e processar.
    //Exemplo. Se myKeyPath = 'Root', vou acessar jsonObj['Root']
    
    let auxJson = undefined;
    let interfaceJson = {};
    let myParams = {};
    interfaceJson['sendTo##webapiDialogs']=[];

    if(jsonObj === undefined || myKey === undefined || myKey==null){
        return undefined;
    }
    //Se é "metalist" é especial. 
    if(myKey == 'metalist'){
        auxJson = jsonObj[myKey];
        if (auxJson !== undefined && auxJson !== null && typeof auxJson == "object"){
            //Qual o componente filho ?
            let arrayKeys = Object.keys(auxJson); 
            let filho = arrayKeys[0];
            //Retornar botao de adicionar filho
            interfaceJson['add###'+filho]=null;
            return JSON.stringify(interfaceJson);
        }       


        return undefined;
    }

    auxJson = jsonObj[myKey];    

    //Agora vamos verificar se é object. Se é, gera menu
    if (auxJson !== undefined && auxJson !== null && typeof auxJson == "object"){
        //Vamos incluir o item de menu na hierarquia. Se for Root Incluir o item "Hierarquia" em MenuBar
        if(myKey=='Root'){
            interfaceJson['Confs']={};
            interfaceJson['Confs']['urlBase']=urlAppData;
            interfaceJson['Confs']['active']='true';
            interfaceJson['Confs']['datetime']=`${Date.now()}`;
            interfaceJson['MenuBar']={};
            interfaceJson['MenuBar']['id'] = 'MainMenuBar';
            interfaceJson['MenuBar']['descricao'] = 'Editor Json';
            interfaceJson['MenuBar']['maxItensPerLine'] = 7;
            interfaceJson['MenuBar']['Hierarquia']={};
            interfaceJson['webapiDialogs']=[];
            interfaceJson['entities']=[];
        }
        else{
            //Aqui temos que gerar um item de menu como entrada
            interfaceJson={}
        }
        //Vamos ver os subitens
        let arrayKeys = Object.keys(auxJson);  
        let arrayValues = Object.values(auxJson); 
        let withoutComplexParams = true;    
        for (let i = 0; i < arrayKeys.length; i++) {
            let key = arrayKeys[i];            

            //Agora vamos avaliar os níveis inferiores.            
            let interfaceJson2 = fillBasicInterfaceJsonFromDict(auxJson, key);
            if(interfaceJson2 !== undefined){ //significa que é um parâmetro complexo
                withoutComplexParams = false;
                let auxJson2 = JSON.parse(interfaceJson2);
                //verificar se foi gerado um webapiDialog para o elemento em key
                if(auxJson2['sendTo##webapiDialogs']!== undefined){
                    for(let j=0;j< auxJson2['sendTo##webapiDialogs'].length;j++){
                        if(myKey=='Root'){
                            interfaceJson['webapiDialogs'].push(auxJson2['sendTo##webapiDialogs'][j]);
                        }
                        else{
                            if(interfaceJson['sendTo##webapiDialogs'] === undefined){
                                interfaceJson['sendTo##webapiDialogs']=[];
                            }                            
                            interfaceJson['sendTo##webapiDialogs'].push(auxJson2['sendTo##webapiDialogs'][j]);
                        }
                    }
                    delete auxJson2['sendTo##webapiDialogs'];
                }

                if(myKey=='Root'){      
                    interfaceJson['MenuBar']['Hierarquia'][key+'_id'] = (Object.keys(auxJson2).length==0)? null:auxJson2;                   
                }
                else{
                    if(key == 'metalist'){
                        let auxSub = auxJson2;
                        let keySubElement = Object.keys(auxSub)[0];
                        interfaceJson[keySubElement] = null;
                    }
                    else{
                        interfaceJson[key+'_id'] = (Object.keys(auxJson2).length==0)? null:auxJson2;                      
                    }
                }
            }
            else{ //significa que o filho é parâmetro simples.
                myParams[key]=arrayValues[i];
            }          
        }

        if(withoutComplexParams == true){
            //Sem submenus! Agora tenho que gerar um diálgo simples...
            let myWebApiDialog ={};
            myWebApiDialog['id']=myKey+'_id';
            myWebApiDialog['nome']=myKey;
            myWebApiDialog['tipo']="webapiDialog";
            myWebApiDialog['urlApi']=urlAppData+'/modificaJsonNode';
            myWebApiDialog['httpMethod']="POST";
            myWebApiDialog['bindingStrategy']="JsonTipoDadosIn";
            myWebApiDialog['bindingParameters']={"nomeEntidade":myKey};
            myWebApiDialog['nomeBotao']='Gravar';
            myWebApiDialog['in']={};
            myWebApiDialog['in']['camposFormObjeto']=Object.keys(myParams).map((item)=>{ return "#" + item;});
            myWebApiDialog['in']['labelsFormObjeto']= Object.keys(myParams);
            myWebApiDialog['in']['readOnlyFormObjeto']=Object.keys(myParams).map((item)=>{ return ""});
            myWebApiDialog['in']['inputFieldFormObjeto']=Object.keys(myParams).map((item)=>{ return "<input type=\"text\""});
            myWebApiDialog['in']['camposObjeto']=Object.keys(myParams);
            myWebApiDialog['in']['campoObjetoId']=null;
            myWebApiDialog['in']['camposFormClassObjeto']=Object.keys(myParams).map((item)=>{ return "form-control"});
            myWebApiDialog['in']['tipoCamposObjeto']=Object.values(myParams);
            myWebApiDialog['in']['chooseFormObjeto']=Object.keys(myParams).map((item)=>{ return ""});
            myWebApiDialog['in']['accordions']=null;
            myWebApiDialog['in']['camposFormObjetoOrder']=null;
            myWebApiDialog['out']=null;
            if(interfaceJson['sendTo##webapiDialogs'] === undefined){
                interfaceJson['sendTo##webapiDialogs']=[];
            }
            interfaceJson['sendTo##webapiDialogs'].push(myWebApiDialog);
        }

        return JSON.stringify(interfaceJson);
    }
    else{ //Se não é objeto então não pode gerar botão de menu, temos que voltar
        return undefined;
    }
}

app.get('/:Dicionario/api/getInterface', jsonParser, function (req, res) {
    var theDict = req.params.Dicionario;
    let realJson = req.session.realJson;    


    var token = req.headers['x-access-token'];
    console.log(token);
    //Pegar o usuario
    var publicKey = fs.readFileSync(server_cert);
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        
        //Pegar o dicionário

        let theDictionaryJsonString = fs.readFileSync(dictPath + theDict+".json");
        let theDictionary = JSON.parse(theDictionaryJsonString);

        //Agora tenho que gerar a interface a partir do dicionário...
        //Vamos ver se há algum preenchimento em cima do dicionário
        if(realJson === undefined || realJson == null){
            //Vamos preencher o básico até onde der...
            realJson = JSON.parse(fillBasicInterfaceJsonFromDict(theDictionary,"Root"));
        }
        else{ //Aqui tenho que usar o Dicionário em conjunto com o realJson! 

            //dddd Antes disso testar a hipótese acima

        }

        

        //Depois tenho que devolver a interface
        req.session.realJson = realJson;
        res.status(200).json(realJson);
        
    });
       
});



if (urlApp.startsWith("http://")) {
    app.listen(port, () => {
        console.log(`Listening at  ${urlApp} (${port})`);
    });
}
else {
    https.createServer(optsHttps, app).listen(port);
}











