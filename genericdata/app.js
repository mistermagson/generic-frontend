/*const http = require('http');
const routes = require('./routes');
const server = http.createServer(routes.handler);
server.listen(3000);*/

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const server_key = 'server_key.pem';
const server_cert = 'server_cert.pem';
//const urlMongo = "mongodb://localhost:27017/";
//const CollectionSistema = 'myEntities';
const CollectionSistema = 'Sistema';
const CollectionInterface = 'Interface';
const CollectionCatalogo = 'Catalogo';
const CollectionMetaCatalogo = 'MetaCatalogo';
const CollectionInterfaceSecurity = 'InterfaceSecurity';
const CollectionSecurity = "Security";
const https = require('https');
const optsHttps = {
    key: fs.readFileSync(server_key)
    , cert: fs.readFileSync(server_cert)
}
//const mongoDB = "SistemaJADB";

//------------ Portas e endere�os
const myconfsFile = 'confsApp.json';
const myconf = JSON.parse(fs.readFileSync(myconfsFile));
/*const portLoginApp = 3000;
const portDataApp = 3001;
const portMasterApp = 9999;*/

const portLoginApp = myconf['portLoginApp'];
const portDataApp = myconf['portDataApp'];
const portMasterApp = myconf['portMasterApp'];

const urlMyHost = myconf['myhost'];
const urlAppLogin = myconf['myhost'] + portLoginApp + ' / ';
const urlAppMaster = myconf['myhost'] + portMasterApp + '/';
const urlAppData = myconf['urlAppData'];
const urlCertHost = myconf['urlCertHost'];
const urlLoginHost = myconf['urlLoginHost'];
const mongoDB = myconf['mongoDB'];
const urlMongo = myconf['urlMongo'];
//------------- Portas e endere�os

//const urlApp = "http://localhost:" + port + "/";
//const port = 3001;

const port = portDataApp;
const urlApp = urlAppData + "/";

const app = express();

//---------- No cache! ----
const nocache = require('nocache');
const { isArray } = require('util');
app.use(nocache());
//----------- No cache! fim ---

app.use(cors()); //Habilita cors para todas as origens - No futuro, fazer restri��es por origem!

var urlencodedParser = bodyParser.urlencoded({ extended: true });
var jsonParser = bodyParser.json();



// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
    res.send('hello world');
});

//    "urlIncluir": "https://localhost:44373/api/Incluir"
app.post('/:Sistema/api/Incluir', jsonParser, function (req, res) {
    console.log("Sistema:" + req.params.Sistema);
    var theCollection = req.params.Sistema;
    //Aqui devo incluir o json no MongoDB    
    var thebody = req.body;
    console.log(thebody);
    traverseJsonToCalcObjectId(thebody, "");
    insertJSON(urlMongo,mongoDB, theCollection, thebody);
    res.status(201).json({message: "Inclusão efetuada com sucesso"});
});


app.get('/getJsonFromRestGetUrl',  function (req, res) {
    var url = req.query.url;
    var myPromise = getJsonFromUrl(url);

    myPromise.then((data) => {
        var myJson = data;
        res.status(200).json(myJson);
    }).catch((err) => {
        res.status(500).json({ 'Erro': err });
    });

});

app.post('/validaToken', jsonParser, function (req, res) {

    var myJson = req.body; //Token passado via post!
    var token = myJson['token'];
    var theCollection = 'Security';

    var publicKey = fs.readFileSync(server_cert);
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        var myObject = decoded;

        //Agora tenho que checar a senha e o email
        var email = myObject['Email'];
        var password = myObject['password'];
        var semSmartCard = myObject['semSmartCard'];
        if (semSmartCard) {
            var theQuery = [{ '$match': { 'tipo': 'Usuario', 'dados.emailUsuario': email/*, 'dados.password': password*/ } }];
            var myPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);
            myPromise.then((data) => {
                if (data[0].dados.emailUsuario == email && data[0].dados.senhaUsuario == password) {
                    res.status(201).json('Autenticado!');
                }
                else {
                    res.status(500).json('N�o!');
                }

            }).catch((err) => {
                res.status(500).json('N�o!');
            });
        }
        else { //Com smartcard
            var theCPF = myObject['CPF'];
            var theQuery = [{ '$match': { 'tipo': 'Usuario', 'dados.emailUsuario': email, 'dados.CPF': theCPF} }];
            var myPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);
            myPromise.then((data) => {
                if (data[0].dados.emailUsuario == email && data[0].dados.CPF == theCPF) {
                    res.status(201).json('Autenticado!');
                }
                else {
                    res.status(500).json('N�o!');
                }

            }).catch((err) => {
                res.status(500).json('N�o!');
            });

        }


        
    });
});

app.get('/:Sistema/api/getWebApiMenuBar', function (req, res) {
    console.log("Sistema:" + req.params.Sistema);
    var theCollection = req.params.Sistema;  
    

    var myPromise = new Promise((resolve, reject) => {
        try {
            var MyMenuBar = geraMenuBar(urlMongo, mongoDB, theCollection, null);
            resolve(MyMenuBar);
        }
        catch (err) {
            reject(err);
        }
    });

    myPromise.then((data) => {
        try {
            var MenuBar = data;
            console.log(MenuBar);
            res.status(200).json(MenuBar);
        }
        catch (err1) {
            res.status(500).json({'mensagem':'N�o consegui gerar o MenuBar!'});
        }
    }).catch((err) => {
        res.status(500).json({ 'mensagem': 'N�o conseguiu gerar MenuBar!' });
    });  
});



app.get('/:Sistema/api/getConsultasJson', function (req, res) {
    console.log("Sistema:" + req.params.Sistema);
    var theCollection = req.params.Sistema;

    var myPromise = geraJsonConsultas(urlMongo, mongoDB, theCollection);

    myPromise.then((data) => {
        try {
            var myJson = data;
            console.log(myJson);
            res.status(200).send(myJson);
        }
        catch (err1) {
            res.status(500).json(err1);
        }
    }).catch((err) => {
        res.status(500);
    });   

});

app.get('/:Sistema/api/getWebApiEntities', function (req, res) {
    var theCollection = req.params.Sistema;
   
    //Neste caso aqui vou retornar o texto das entidades (webapis.json), geradas dinamicamente
    
    var myPromise = geraJsonWebApiEntities(urlMongo, mongoDB, theCollection);    

    myPromise.then((data) => { 
        try {
            var myJson = data;
            console.log(myJson);
            res.status(200).send(myJson);
        }
        catch(err1){
            res.status(500).json(err1);
        }
    }).catch((err) => {
        res.status(500);
    });    
});

app.post('/:Sistema/:Escopo/api/IncluirInterface', jsonParser, function (req, res) {
    var Sistema = req.params.Sistema;
    var Escopo = req.params.Escopo;
    console.log("A inser��o do MetaCatalogo veio de: " + Escopo);
    var theCollection = Escopo;
    var theBody = req.body; // meu webapis.json
    //var myJson = JSON.parse(theBody.dados.jsonMetaCatalogo);
    var myJson = JSON.parse(theBody.dados.jsonInterface);
    var malFormatado = false;
    var escopoNaoPermitido = false;
        
    //Colocando "active":"true" em Confs em myJson
    if (myJson['Confs'] == null || myJson['Confs'] == "") { malFormatado = true; }
    if (Escopo != "MetaCatalogo" && Escopo != "InterfaceSecurity") { escopoNaoPermitido = true; }

    //Por enquanto, somente os escopos MetaCatalogo e IterfaceSecurity ser�o aceitos

    if (malFormatado) { res.status(500).json({ message: "Este MetaCat�logo est� mal formatado!" }); }
    else if (escopoNaoPermitido) { res.status(500).json({ message: "Este escopo n�o � permitido. Somente aceit�vel MetaCatalogo e InterfaceSecurity" }); }
    else {
        myJson['Confs']['active'] = 'true';
        myJson['Confs']['datetime'] = `${Date.now()}`;

        //Tenho que apagar qualquer metacat�logo/InterfaceSecurity anterior
        var myPromiseDesativar = desativarInterfacesAnteriores(urlMongo, mongoDB, theCollection)

        myPromiseDesativar.then((data1) => {
            //Vamos incluir a nova interface
            var myPromiseIncluir = incluirNovaInterface(urlMongo, mongoDB, theCollection, JSON.stringify(myJson));
            myPromiseIncluir.then((data2) => {                
                res.status(200).json({ message: "Inclus�o da Interface efetuada com sucesso" });
            }).catch((err1) => { res.status(500); });
        }).catch((err2) => { res.status(500); });
    }

});

app.post('/:Sistema/api/SincronizarCatalogo', function (req, res) {
    //Vou colocar o cat�logo na Collection Interface
    console.log("Sistema:" + req.params.Sistema);
    var theCollection = CollectionInterface;
    var theCatalogoCollection = CollectionCatalogo;
    var theInterfaceCollection = CollectionInterface;
    var theCollectionSistema = CollectionSistema;
    
    //Neste caso aqui vou retornar o texto das entidades (webapis.json), geradas dinamicamente
    var theDateTime = Date.now();
    var theConf = '"Confs":{"urlBase":"' +urlApp + theCollectionSistema + '","active":"true","datetime":"' + theDateTime + '"},';
    
    var MenuBar = geraMenuBar(urlMongo, mongoDB, theCatalogoCollection, null);
    var promiseJsonConsulta = geraJsonConsultas(urlMongo, mongoDB, theCatalogoCollection);

    
    var myPromise = geraJsonWebApiEntities(urlMongo, mongoDB, theCatalogoCollection);
    var myPromiseDesativar = desativarInterfacesAnteriores(urlMongo, mongoDB, theInterfaceCollection);

    myPromise.then((data) => {
        MenuBar.then((dataMenu) => {            
            promiseJsonConsulta.then((dataConsulta) => {
                var jsonMenu = '"MenuBar":' + JSON.stringify(dataMenu);            
                var myJson = '{' + theConf + jsonMenu + ',' + dataConsulta + ',' + data + '}';
                //Vamos desativar as interfaces anteriores.
                myPromiseDesativar.then((data2) => {
                    //Vamos incluir a nova interface            
                    var myPromiseIncluir = incluirNovaInterface(urlMongo, mongoDB, theInterfaceCollection, myJson);
                    myPromiseIncluir.then((data3) => {
                        //console.log(myJson);
                        res.status(200).json({ message: "Sincroniza��o efetuada com sucesso" });
                    }).catch((err3) => { res.status(500); });
                }).catch((err2) => { res.status(500); });
            }).catch((errConsulta) => { res.status(500); });                      
        }).catch((errmenu) => { res.status(500);});
    }).catch((err) => { res.status(500); });
    
});

//"urlLoadObjetos": "https://localhost:44373/api/Listar?qualEntidade=CDP&pageSize=",
app.get('/:Sistema/api/Listar', function (req, res) {   
    console.log("Sistema:" + req.params.Sistema);
    console.log("req.originalUrl:" + req.originalUrl);
    var theCollection = req.params.Sistema;
    var qualEntidade = req.query.qualEntidade;
    var pageSize = req.query.pageSize;
    var filtro = req.query.filtro;
    console.log("filtro:" + filtro);
    var page = req.query.page;
    var filtroExpression = getFiltroExpression(filtro);
    filtroExpression += (filtroExpression != "") ? "," : "";
    console.log("filtroExpression:" + filtroExpression);

    var theSkip = (page != null && page!= "" && pageSize != "" && pageSize != null)? ((Number.parseInt(page)-1) * Number.parseInt(pageSize)):0;
    var auxTipo = "dados." + qualEntidade +"Id";   
    var auxS = '[{ "$match":{"tipo": "' + qualEntidade + '"}},{ "$set":{"' + auxTipo +
        '":"$_id"}},{ "$replaceRoot":{"newRoot":"$dados"}},' +
        filtroExpression +
        '{"$skip":' + theSkip + '},' +
        '{"$limit": ' + pageSize + ' }]';

    console.log("theQuery:" + auxS);
    var theQuery = JSON.parse(auxS);
    traverseJsonToCalcObjectId(theQuery, "");


    
    var theJSONString = "";   

    //var myPromise = aggregateJSON(urlMongo, mongoDB, "myEntities", theQuery, pageSize, filtro);
    var myPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);

    myPromise.then((data) => {
        //console.log("Aqui 5");
        console.log(data);
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500);
    });    
});

//"urlObter": "https://localhost:44373/api/Obter/?Tipo_Id=CDP_",
app.get('/:Sistema/api/Obter', function (req, res) {   
    var theCollection = req.params.Sistema;
    console.log("Sistema:" + req.params.Sistema);
    var tipoId = req.query.Tipo_Id;
   
    if (tipoId == "" || tipoId == null) {
        res.status(500).json({ 'mensage': 'Faltou um par�metro! Tipo_Id!' });
    }

    var tipo = tipoId.split("_")[0];
    var Id = tipoId.split("_")[1];
    var o_Id = new ObjectId(Id);        
    //var theQuery = { "_id": o_Id, "tipo": tipo };  
    //var myPromise = queryOneJSON(urlMongo, mongoDB, "myEntities", theQuery);

    var auxTipo = "dados." + tipo + "Id";  
    //console.log("o_Id:" + o_Id);
    //var theQuery = JSON.parse('[{ "$match":{"_id": "' + o_Id + '"}},{ "$replaceRoot":{"newRoot":"$dados"}}]');
    var theQuery = [
        { "$match": { "_id": o_Id } },
        { "$set": { [auxTipo]: "$_id" } },
        { "$replaceRoot": { "newRoot": "$dados" } }
    ];
    
    //console.log("theQuery:" + JSON.stringify(theQuery));

    var myPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);    

    myPromise.then((data) => {        
        res.status(200).json(data[0]);
    }).catch((err) => {
        res.status(500);
    });
});

//"urlCount": "https://localhost:44373/api/Count?qualEntidade=CDP",
app.get('/:Sistema/api/Count', function (req, res) {
    var theCollection = req.params.Sistema;
    console.log("Sistema:" + req.params.Sistema);
    var qualEntidade = req.query.qualEntidade;           
    var theQuery = { "tipo": qualEntidade };

    var myPromise = queryCount(urlMongo, mongoDB, theCollection, theQuery);

    myPromise.then((myCount) => {
        res.status(200).json(myCount);
    }).catch((err) => {
        res.status(500);
    });
});

//"urlApagar": "https://localhost:44373/api/Delete/?Tipo_Id=CDP_",
app.delete('/:Sistema/api/Delete', function (req, res) {
    var theCollection = req.params.Sistema;
    console.log("Sistema:" + req.params.Sistema);
    var tipoId = req.query.Tipo_Id;

    if (tipoId == "" || tipoId == null) {
        res.status(500).json({ 'mensagem': 'Faltou um par�metro! Tipo_Id!' });
    }

    var tipo = tipoId.split("_")[0];
    var Id = tipoId.split("_")[1];
    var o_Id = new ObjectId(Id);    
    var theQuery = { "_id": o_Id };  
   
    var myPromise = deleteFromQuery(urlMongo, mongoDB, theCollection, theQuery);

    myPromise.then((data) => {
        res.status(200).json({ 'mensagem': 'A exclus�o foi efetuada com sucesso!' });
    }).catch((err) => {
        res.status(500);
    });
});

//"urlAlterar": "https://localhost:44373/api/Alterar"

app.put('/:Sistema/api/Alterar', jsonParser, function (req, res) {
    var theCollection = req.params.Sistema;
    console.log("Sistema:" + req.params.Sistema);
    //Aqui devo incluir o json no MongoDB    
    var theJsonAlterar = req.body;
    console.log("theJsonAlterar:");
    console.log(theJsonAlterar);
    traverseJsonToCalcObjectId(theJsonAlterar, "");
    var tipo = theJsonAlterar["tipo"];
    var auxTipo = tipo + "Id";
    var Id = theJsonAlterar.dados[auxTipo];
    console.log("auxTipo:" + auxTipo);
    console.log("Id:" + Id);
    var o_Id = new ObjectId(Id);
    delete theJsonAlterar.dados[auxTipo];
    console.log("theJsonAlterar:");   
    console.log(theJsonAlterar);
    
    //traverseJsonToCalcObjectId(theJsonAlterar, "");

    var theQuery = { "_id": o_Id };  
    var theSet = { "$set": { dados: theJsonAlterar.dados } };

   // console.log(theSet);

    var myPromise = updateJSON(urlMongo, mongoDB, theCollection, theQuery, theSet);

    myPromise.then((data) => {
        res.status(200).json({ 'mensagem': 'Alterado com sucesso!' });
    }).catch((err) => {
        res.status(500);
    });
    
   
});

function filtraMenuBarHierarquia(Hierarquia, itensDeMenu, newHierarquia) {
    if (Hierarquia !== null && typeof Hierarquia == "object") {
        var arrayKeys = Object.keys(Hierarquia);
        var arrayValues = Object.values(Hierarquia);

        for (var i = 0; i < arrayKeys.length; i++) {
            var key = arrayKeys[i];
            if (Hierarquia[key] != null && typeof Hierarquia[key] == "object") {
                newHierarquia[key] = {};
                filtraMenuBarHierarquia(Hierarquia[key], itensDeMenu, newHierarquia[key]);
                 
                if (Object.keys(newHierarquia[key]).length ==0) {
                    delete newHierarquia[key];
                }
            }
            else {                             
                for (let j = 0; j < itensDeMenu.length; j++) {
                    var item = itensDeMenu[j]['_id']['item'];
                    if (item == key) {
                        newHierarquia[key] = null;
                    }
                }
            }           
        }        
    }
}

function getEscoposFromItensMenu(itensMenu) {
    var Escopos = null;
    if (itensMenu == "" || itensMenu == null) {
        return null;
    }
    if (isArray(itensMenu) == false) {
        return null;
    }

    for (let j = 0; j < itensMenu.length; j++) {
        if (itensMenu[j]['_id'] != null && itensMenu[j]['_id'] != "") {
            var escopo = itensMenu[j]['_id']['escopo'];
            if (escopo != null && escopo != null) {
                if (Escopos == null) {
                    Escopos = {};
                }

                if (Escopos[escopo] == null || Escopos[escopo] == "") {

                    Escopos[escopo] = true;
                }
            }
        }
    }
    return Escopos;
}

app.get('/:EscopoDeInterface/api/getInterface', jsonParser, function (req, res) {
    var theCollection = req.params.EscopoDeInterface;
    var qualEntidade = req.query.qualEntidade;
    var theQuery = [{ "$match": { "Confs.active": "true" } }, { "$project": { "_id": 0 } }];

    var token = req.headers['x-access-token'];
    console.log(token);
    //Pegar o usuario
    var publicKey = fs.readFileSync(server_cert);
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        var myObject = decoded;

        //Pegar o e-mail       
        var email = myObject['Email'];
        //pegar a interface...
        var myPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);

        myPromise.then((data) => {
            var myInterface = data[0];
            return myInterface;
        }).then((myInterface) => {            

            hasRootProfile(urlMongo, mongoDB, CollectionSecurity, email).then((data) => {
                if (data.length == 0 && email != "root@root.com") {
                    //Pegar lista de ids autorizados ao e-mail
                    //A MenuBar tem que ser modificada para somente conter ids que s�o autorizados ao e-mail!
                    var myPromise2 = getItensMenuFromEmail(urlMongo, mongoDB, CollectionSecurity, email);

                    myPromise2.then((data2) => {
                        var itensMenu = data2;
                        console.log(`Itens de menu autorizados para ${email}:`);
                        console.log(data2);
                        return itensMenu;
                    }).then((itensMenu) => {
                        //Aqui vou pegar a webapis.json
                        //Pegar a interface
                        var myHierarquia = myInterface['MenuBar']['Hierarquia'];
                        var newHierarquia = {};
                        //Modificar MenuBar, deixando somente n�s folha listados em itensMenu
                        filtraMenuBarHierarquia(myHierarquia, itensMenu, newHierarquia);
                        myInterface['MenuBar']['Hierarquia'] = newHierarquia;
                        myInterface['Escopos'] = getEscoposFromItensMenu(itensMenu);
                        res.status(200).json(myInterface);
                    })
                }
                else {
                    res.status(200).json(myInterface);
                }
            })
        }).catch((err3) => {
                res.status(500);
        });
        
    });
       
});

//Vou executar uma consulta cadastrada no cat�logo, com par�metros enviados via GET na url
app.get('/:Sistema/api/ExecutarConsulta', function (req, res) {
    var theCollectionInterface = CollectionInterface;
    var theCollectionSistema = CollectionSistema;
    //var theCollection = req.params.Sistema;
    var theCollection = CollectionCatalogo;
    var nomeConsulta = req.query.nome;
    var seArray = req.query.seArray;

    if (nomeConsulta == null || nomeConsulta == "") {
        res.status(500).json({ 'mensagem': 'Faltou o nome da consulta!' });
    }

    seArray = (seArray == null || seArray == "" || seArray== "true")? "true": "false";

    //Pegando dados da consulta
    var theQuery = [
        { '$match': { 'tipo': 'ConsultaDados', 'dados.nome': nomeConsulta } },        
        { '$replaceRoot': {'newRoot':'$dados'}}
    ];
    var parametrosConsultaPromise = aggregateJSON(urlMongo, mongoDB, theCollection, theQuery);
    parametrosConsultaPromise.then((data) => {
        if (data[0] == null || data[0] == "") {
            res.status(500);
        }
        else {            
            var listaParametros = (data[0]['listaParametros'] != null && data[0]['listaParametros'] != "") ? data[0]['listaParametros'].split('\n') : [];
            var linguagem = (data[0]['linguagem'] != null && data[0]['linguagem'] != "") ? data[0]['linguagem'] : "";
            var codigoFonte = (data[0]['codigoFonte'] != null && data[0]['codigoFonte'] != "") ? data[0]['codigoFonte'] : "";
            var escopo = (data[0]['escopo'] != null && data[0]['escopo'] != "") ? data[0]['escopo'] : "";

            // Agora vou colocar os par�metros no meu c�digo fonte da consulta
            for (let i = 0; i < listaParametros.length; i++) {
                let x = listaParametros[i];
                let parameterValue = req.query[x];
                //codigoFonte = codigoFonte.split('@' + x + '@').join(parameterValue);
                codigoFonte = myReplaceAll(codigoFonte,'@' + x + '@',parameterValue);
            }
            //Vamos executar a consulta ... SEMPRE AGGREGATE no caso do mongo
            if (linguagem == 'mongo') {
                //Dados/Negocio/Interface/Sistema
                var theCollectionExecution = getMyCollectionFromEscopo(escopo);
                var myObjConsulta = JSON.parse(codigoFonte);
                var myPromiseConsulta = aggregateJSON(urlMongo, mongoDB, theCollectionExecution, myObjConsulta);
                myPromiseConsulta.then((data) => {
                    //Consegui executar a consulta, retornar o json..
                    if (seArray == "false") {
                        console.log(data[0]);
                        res.status(200).json(data[0]);
                    }
                    else {
                        console.log(data);
                        res.status(200).json(data);
                    }
                }).catch((err) => { res.status(500).json({ 'mensagem': 'erro no c�digo fonte da consulta!' }); });                
            }
            else if (linguagem == 'javascript') {
                //Dados/Negocio / Interface / Sistema
                var theCollectionExecution = getMyCollectionFromEscopo(escopo);
                var myJsCode = codigoFonte;
                /*O c�digo javascript deve retornar com return um objeto json. Tal c�digo seria encapsulado em uma fun��o sem par�metros. 
                 * Pois os par�metros @par1, @par2,... @par3 j� estariam substitu�dos no c�digo.
                 */
                myJsCode = codigoFonte;                
                var theFunction = new Function(myJsCode);
                //var theFunction = new Function('a', 'b', 'return a + b');
                //theReturn = theFunction(10,50);
                theReturn = theFunction();
                console.log(theReturn);
                res.status(200).json(theReturn);
            }
            else if (linguagem == 'simpleGET') {                
                var urlGET = codigoFonte;
                var myPromiseGet = getJsonFromUrl(urlGET)
                myPromiseGet.then((data) => {                   
                    console.log(data);
                    res.status(200).json(data);
                }).catch((err) => { res.status(500).json({ 'mensagem': 'erro no c�digo fonte da consulta!' }); });       
            }
            else {
                res.status(500).json({'mensagem':'N�o � um query do tipo mongodb new javascript'});
            }
        }
    }).catch((err) => { res.status(500); });

});

if (urlApp.startsWith("http://")) {
    app.listen(port, () => {
        console.log(`Listening at  ${urlApp} (${port})`);
    });
}
else {
    https.createServer(optsHttps, app).listen(port);
}







//---------------Fun��es B�sicas
function getMyCollectionFromEscopo(escopo) {
    if (escopo == 'Sistema') return CollectionSistema;
    if (escopo == 'Interface') return CollectionInterface;
    if (escopo == 'Dados') return CollectionCatalogo;
    if (escopo == 'Neg�cio') return CollectionSistema;
    if (escopo == 'MetaCatalogo') return CollectionMetaCatalogo;
    if (escopo == 'InterfaceSecurity') return 'InterfaceSecurity';
}
function myReplaceAll(oldString, replacethis, withthis) {
    return oldString.split(replacethis).join(withthis);
}

function desativarInterfacesAnteriores(urlMongo, myDB, theCollection) {

    var theQuery = { 'Confs.active': 'true' };
    //var theSet = { '$set': { 'Confs.active': 'false' } };    
    //var theQuery = { "_id": o_Id };

    var myPromise = deleteFromQuery(urlMongo, myDB, theCollection, theQuery);

    //var myPromise = updateJSON(urlMongo, myDB, theCollection, theQuery, theSet);
    return myPromise;    
}

function incluirNovaInterface(urlMongo, myDB, theCollection, theJsonInterface) {
    //console.log(theJsonInterface);
    var myObject = JSON.parse(theJsonInterface);
    var myPromise = insertJSONPromise(urlMongo, myDB, theCollection, myObject);
    return myPromise
}

/*function getFiltroExpression(theFilter) {
    console.log("theFilter:" + theFilter);
    if (theFilter == null || theFilter == "") {
        return "";
    }
    var expressao = '{"$match":{"$or":[';
    var filtroaux = "";
    var auxArray = theFilter.split(";");

    for (var i = 0; i < auxArray.length; i++) {
        if (i > 1) {
            expressao += ",";
        }
        if (i == 0) {
            filtroaux = auxArray[0];
        }
        else {
            var filtroaux2 = '{ "$regex": "' + filtroaux + '", "$options": "i" }'
            expressao += '{"' + auxArray[i] + '":' + filtroaux2 + '}';
        }
    }
    expressao += "]}}";
    if (expressao == '{"$match":{"$or":[]}}') {
        return "";
    }
    return expressao;
}*/

function getFiltroExpression(theFilter) {
    console.log("theFilter:" + theFilter);   

    if (theFilter == null || theFilter == "") {
        return "";
    }
    var expressao = '{"$match":{"$and":[';
    var ExpressionsArray = theFilter.split("###");
    for (let k = 0; k < ExpressionsArray.length; k++) {
        var filtroaux = "";
        var auxArray = ExpressionsArray[k].split(";");

        if (k > 0) {
            expressao += ",";
        }
        expressao += (auxArray[0] == 'or') ? '{"$or":[' : (auxArray[0] == 'and') ? '{"$and": [' : (auxArray[0] == 'eq') ? '{' : '{';
        
        for (var i = 1; i < auxArray.length; i++) {
            if (i > 2) {
                expressao += ",";
            }
            if (i == 1) {
                filtroaux = auxArray[1];               
            }
            else {                
                if (auxArray[0] != 'eq') {
                    var filtroaux2 = '{ "$regex": "' + filtroaux + '", "$options": "i" }'
                    expressao += '{"' + auxArray[i] + '":' + filtroaux2 + '}';
                }
                else {                    
                    var filtroaux2 = '"' + filtroaux + '":"' + auxArray[i] +'"'
                    expressao += filtroaux2;
                }
            }
        }
        expressao += (auxArray[0] == 'or' || auxArray[0] == 'and') ? ']}' : '}';

    }
    expressao += "]}}";   
       
    if (expressao == '{"$match":{"$and":[]}}') {
        return "";
    }
    console.log("expressao:" + expressao);  
    return expressao;
}


function insertJSONPromise(url, myDB, theCollection, theJsonObject) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);
            var myobj = theJsonObject;
            dbo.collection(theCollection).insertOne(myobj, function (err, res) {
                if (err) {
                    reject(err);
                }                
                db.close();
                resolve("1 document inserted");
            });
        });
    });
    return promise;
}

function insertJSON(url, myDB, theCollection, theJsonObject) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(myDB);
        var myobj = theJsonObject;
        dbo.collection(theCollection).insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
        });
    });
}

function deleteFromQuery(url, myDB, theCollection, theQuery) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);
            //console.log(JSON.stringify(theQuery));
            dbo.collection(theCollection).deleteOne(theQuery, function (err, obj) {
                if (err) throw err;
                //console.log("1 document deleted");
                db.close();
                resolve('1 document deleted');
            });
        });
    });
    return promise;
}

//function aggregateJSON(url, myDB, theCollection, theQuery, pageSize, filtro) {
function aggregateJSON(url, myDB, theCollection, theQuery) {
    //console.log("theQuery" + JSON.stringify(theQuery));
    //console.log("url:" + url);
    //console.log("theColelction:" + theCollection);
    //console.log("myDB:" + myDB);
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);                        
            //console.log(JSON.stringify(theQuery));
            //console.log("Aqui 1");
            dbo.collection(theCollection).aggregate(theQuery).toArray(function (err, result) {
                //console.log("Aqui 2");                
                var myReturn = result;
                //console.log("Aqui 3");
                db.close();
                //console.log("Aqui 4");
                resolve(myReturn);
            });
        });
    });

    return promise;
}

function updateJSON(url, myDB, theCollection, theQuery, theSet) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);
            dbo.collection(theCollection).updateOne(theQuery,theSet, function (err, res) {
                if (err) {
                    reject(err);
                }                
                //console.log("1 document updated");
                db.close();
                resolve('OK');
            });
        });
    });

    return promise;
}
function getItensMenuFromEmail(urlMongo, myDB, myCollection, email) {
    var theQuery = /*[
        { '$match': { 'tipo': 'Usuario' } },
        { '$match': { 'dados.emailUsuario': email } },
        //Perfis de Usuario
        {
            '$lookup': {
                'from': 'Security',
                'let': { 'idUser': '$_id' },
                'pipeline': [
                    { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                    { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                    { '$replaceRoot': { 'newRoot': '$dados' } },
                    { '$project': { 'UsuarioId': 0 } }
                    //Dados do Perfil
                    , {
                        '$lookup': {
                            'from': 'Security',
                            'let': { 'idPerf': '$PerfilId' },
                            'pipeline': [
                                { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                { '$match': { '$expr': { '$eq': ['$_id', '$$idPerf'] } } },
                                { '$replaceRoot': { 'newRoot': '$dados' } }
                                //,{'$project':{'nomePerfil':1}}
                                //Itens de Menu
                                , {
                                    '$lookup': {
                                        'from': 'Security',
                                        'let': { 'idPerf': '$PerfilId' },
                                        'pipeline': [
                                            { '$match': { '$expr': { '$eq': ['$tipo', 'ItemMenuPerfil'] } } },
                                            { '$match': { '$expr': { '$eq': ['$PerfilId', '$$idPerf'] } } },
                                            { '$replaceRoot': { 'newRoot': '$dados' } }
                                        ],
                                        'as': 'ItemDeMenu'
                                    }
                                }
                                , { '$unwind': { 'path': '$ItemDeMenu' } }
                            ],
                            'as': 'Perfil'
                        }
                    }
                    , { '$unwind': { 'path': '$Perfil' } }
                ],
                'as': 'PerfisUsuario'
            }
        }
        , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.ItemDeMenu.IdElementoInterface': 1 } }
        , { '$unwind': { 'path': '$PerfisUsuario' } }
        , { '$project': { 'ItemDeMenu': '$PerfisUsuario.Perfil.ItemDeMenu.IdElementoInterface' } }
        , { '$group': { '_id': '$ItemDeMenu' } }
    ]*/
        /*[
            { '$match': { 'tipo': 'Usuario' } },
            { '$match': { 'dados.emailUsuario': email } },
            //Perfis de Usuario
            {
                '$lookup': {
                    'from': 'Security',
                    'let': { 'idUser': '$_id' },
                    'pipeline': [
                        { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                        { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                        { '$replaceRoot': { 'newRoot': '$dados' } }
                        //,{'$project':{'UsuarioId':0}}
                        //Dados do Perfil
                        , {
                            '$lookup': {
                                'from': 'Security',
                                'let': { 'idPerfil': '$PerfilId' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idPerfil'] } } }
                                    , { '$replaceRoot': { 'newRoot': '$dados' } }
                                    , { '$project': { 'nomePerfil': 1, 'PerfilId': '$$idPerfil' } }
                                    //Itens de Menu
                                    , {
                                        '$lookup': {
                                            'from': 'Security',
                                            'let': { 'idPerf2': '$PerfilId' },
                                            'pipeline': [
                                                { '$match': { '$expr': { '$eq': ['$tipo', 'ItemMenuPerfil'] } } },
                                                { '$match': { '$expr': { '$eq': ['$dados.PerfilId', '$$idPerf2'] } } }
                                                //,{'$replaceRoot':{'newRoot':'$dados'}}
                                            ],
                                            'as': 'ItemDeMenu'
                                        }
                                    }
                                    , { '$unwind': { 'path': '$ItemDeMenu' } }
                                ],
                                'as': 'Perfil'
                            }
                        }
                        , { '$unwind': { 'path': '$Perfil' } }
                    ],
                    'as': 'PerfisUsuario'
                }
            }
            , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface': 1 } }
            , { '$unwind': { 'path': '$PerfisUsuario' } }
            , { '$project': { 'ItemDeMenu': '$PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface' } }
            , { '$group': { '_id': '$ItemDeMenu' } }
        ] */

        /*[
            { '$match': { 'tipo': 'Usuario' } },
            { '$match': { 'dados.emailUsuario': email } },
            //Perfis de Usuario
            {
                '$lookup': {
                    'from': 'Security',
                    'let': { 'idUser': '$_id' },
                    'pipeline': [
                        { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                        { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                        { '$replaceRoot': { 'newRoot': '$dados' } }
                        //,{'$project':{'UsuarioId':0}}
                        //Dados do Perfil
                        , {
                            '$lookup': {
                                'from': 'Security',
                                'let': { 'idPerfil': '$PerfilId' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idPerfil'] } } }
                                    , { '$replaceRoot': { 'newRoot': '$dados' } }
                                    , { '$project': { 'nomePerfil': 1, 'PerfilId': '$$idPerfil' } }
                                    //Itens de Menu
                                    , {
                                        '$lookup': {
                                            'from': 'Security',
                                            'let': { 'idPerf2': '$PerfilId' },
                                            'pipeline': [
                                                { '$match': { '$expr': { '$eq': ['$tipo', 'ItemMenuPerfil'] } } },
                                                { '$match': { '$expr': { '$eq': ['$dados.PerfilId', '$$idPerf2'] } } }
                                                //,{'$replaceRoot':{'newRoot':'$dados'}}
                                            ],
                                            'as': 'ItemDeMenu'
                                        }
                                    }
                                    , { '$unwind': { 'path': '$ItemDeMenu' } }
                                ],
                                'as': 'Perfil'
                            }
                        }
                        , { '$unwind': { 'path': '$Perfil' } }
                    ],
                    'as': 'PerfisUsuario'
                }
            }
            , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface': 1, 'PerfisUsuario.Perfil.ItemDeMenu.dados.EscopoElementoInterface': 1 } }
            , { '$unwind': { 'path': '$PerfisUsuario' } }
            , { '$project': { 'ItemDeMenu': '$PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface', 'Escopo': '$PerfisUsuario.Perfil.ItemDeMenu.dados.EscopoElementoInterface' } }
            , { '$group': { '_id': { item: '$ItemDeMenu', escopo: '$Escopo' } } }
        ]*/
        [
            { '$match': { 'tipo': 'Usuario' } },
            { '$match': { 'dados.emailUsuario': email } },
            //Perfis de Usuario
            {
                '$lookup': {
                    'from': 'Security',
                    'let': { 'idUser': '$_id' },
                    'pipeline': [
                        { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                        { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                        { '$replaceRoot': { 'newRoot': '$dados' } }
                        //,{'$project':{'UsuarioId':0}}
                        //Dados do Perfil
                        , {
                            '$lookup': {
                                'from': 'Security',
                                'let': { 'idPerfil': '$PerfilId' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idPerfil'] } } }
                                    , { '$replaceRoot': { 'newRoot': '$dados' } }
                                    , { '$project': { 'nomePerfil': 1, 'PerfilId': '$$idPerfil' } }
                                    //Itens de Menu
                                    , {
                                        '$lookup': {
                                            'from': 'Security',
                                            'let': { 'idPerf2': '$PerfilId' },
                                            'pipeline': [
                                                { '$match': { '$expr': { '$eq': ['$tipo', 'ItemMenuPerfil'] } } },
                                                { '$match': { '$expr': { '$eq': ['$dados.PerfilId', '$$idPerf2'] } } }
                                                //,{'$replaceRoot':{'newRoot':'$dados'}}
                                            ],
                                            'as': 'ItemDeMenu'
                                        }
                                    }
                                    , { '$unwind': { 'path': '$ItemDeMenu' } }
                                ],
                                'as': 'Perfil'
                            }
                        }
                        , { '$unwind': { 'path': '$Perfil' } }
                    ],
                    'as': 'PerfisUsuario'
                }
            }
            , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface': 1, 'PerfisUsuario.Perfil.ItemDeMenu.dados.EscopoElementoInterface': 1 } }
            , { '$unwind': { 'path': '$PerfisUsuario' } }
            , { '$project': { 'ItemDeMenu': '$PerfisUsuario.Perfil.ItemDeMenu.dados.IdElementoInterface', 'Escopo': '$PerfisUsuario.Perfil.ItemDeMenu.dados.EscopoElementoInterface' } }
            //,{'$group':{'_id':{item:'$ItemDeMenu',escopo:'$Escopo'}}}	
            ,
            {
                '$unionWith': {
                    coll: 'Security', 'pipeline':
                        [
                            { '$match': { 'tipo': 'Usuario' } },
                            { '$match': { 'dados.emailUsuario': email} },
                            //Perfis de Usuario
                            {
                                '$lookup': {
                                    'from': 'Security',
                                    'let': { 'idUser': '$_id' },
                                    'pipeline': [
                                        { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                                        { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                                        { '$replaceRoot': { 'newRoot': '$dados' } }
                                        //Dados do Perfil
                                        , {
                                            '$lookup': {
                                                'from': 'Security',
                                                'let': { 'idPerfil': '$PerfilId' },
                                                'pipeline': [
                                                    { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idPerfil'] } } }
                                                    , { '$replaceRoot': { 'newRoot': '$dados' } }
                                                    , { '$project': { 'nomePerfil': 1, 'PerfilId': '$$idPerfil' } }
                                                    //AQUI!
                                                    , {
                                                        '$lookup': {
                                                            'from': 'Security',
                                                            'let': { 'idPai': '$PerfilId' },
                                                            'pipeline': [
                                                                { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilEmPerfil'] } } },
                                                                { '$match': { '$expr': { '$eq': ['$dados.PerfilPossuidorId', '$$idPai'] } } }
                                                                , { '$project': { 'dados.PerfilId': 1, '_id': 0 } }
                                                                , { '$replaceRoot': { 'newRoot': '$dados' } }
                                                                //Itens de Menu			
                                                                , {
                                                                    '$lookup': {
                                                                        'from': 'Security',
                                                                        'let': { 'idPerf2': '$PerfilId' },
                                                                        'pipeline': [
                                                                            { '$match': { '$expr': { '$eq': ['$tipo', 'ItemMenuPerfil'] } } },
                                                                            { '$match': { '$expr': { '$eq': ['$dados.PerfilId', '$$idPerf2'] } } }
                                                                            //,{'$replaceRoot':{'newRoot':'$dados'}}
                                                                        ],
                                                                        'as': 'ItemDeMenu'
                                                                    }
                                                                }
                                                                , { '$unwind': { 'path': '$ItemDeMenu' } }
                                                            ],
                                                            'as': 'PerfisFilho'
                                                        }
                                                    }
                                                    , { '$unwind': { 'path': '$PerfisFilho' } }
                                                ],
                                                'as': 'Perfil'
                                            }
                                        }
                                        , { '$unwind': { 'path': '$Perfil' } }
                                    ],
                                    'as': 'PerfisUsuario'
                                }
                            }
                            , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.PerfisFilho.ItemDeMenu.dados.IdElementoInterface': 1, 'PerfisUsuario.Perfil.PerfisFilho.ItemDeMenu.dados.EscopoElementoInterface': 1 } }
                            , { '$unwind': { 'path': '$PerfisUsuario' } }
                            , { '$replaceRoot': { 'newRoot': '$PerfisUsuario.Perfil.PerfisFilho.ItemDeMenu.dados' } }
                            , { '$project': { 'ItemDeMenu': '$IdElementoInterface', 'Escopo': '$EscopoElementoInterface' } }
                        ]
                }
            }
            ,{'$group':{'_id':{item:'$ItemDeMenu',escopo:'$Escopo'}}}
        ]
        ;

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);

    return myPromise;

    //

}

function hasRootProfile(urlMongo, myDB, myCollection, email) {
    var myCatalog = myCollection;

    var theQuery = [
        { '$match': { 'tipo': 'Usuario' } },
        { '$match': { 'dados.emailUsuario': email } },
        //Perfis de Usuario
        {
            '$lookup': {
                'from': 'Security',
                'let': { 'idUser': '$_id' },
                'pipeline': [
                    { '$match': { '$expr': { '$eq': ['$tipo', 'PerfilUsuario'] } } },
                    { '$match': { '$expr': { '$eq': ['$dados.UsuarioId', '$$idUser'] } } },
                    { '$replaceRoot': { 'newRoot': '$dados' } },
                    { '$project': { 'UsuarioId': 0 } }
                    //Dados do Perfil
                    , {
                        '$lookup': {
                            'from': 'Security',
                            'let': { 'idPerf': '$PerfilId' },
                            'pipeline': [
                                { '$match': { '$expr': { '$eq': ['$tipo', 'Perfil'] } } },
                                { '$match': { '$expr': { '$eq': ['$_id', '$$idPerf'] } } },
                                { '$replaceRoot': { 'newRoot': '$dados' } }
                                , { '$match': { 'nomePerfil': 'root' } }
                                , { '$project': { 'nomePerfil': 1 } }
                            ],
                            'as': 'Perfil'
                        }
                    }
                    , { '$unwind': { 'path': '$Perfil' } }
                ],
                'as': 'PerfisUsuario'
            }
        }
        , { '$project': { '_id': 0, 'PerfisUsuario.Perfil.nomePerfil': 1 } }
        , { '$unwind': { 'path': '$PerfisUsuario' } }
        , { '$project': { 'Perfil': '$PerfisUsuario.Perfil.nomePerfil' } }
        , { '$group': { '_id': '$Perfil' } }
        , { '$count': 'Count' }
    ];

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);

    return myPromise;

}

function getJSONEntidadeFromCatalogo(urlMongo, myDB, myCollection,nomeEntidade) {
    var myCatalog = myCollection;

    var theQuery =

        [
            {
                // Entidade Catalogo
                '$match': {
                    'tipo': 'EntidadeCatalogo',
                    'dados.nome':nomeEntidade
                }
            }
            // Relacionamentos
            , {
                '$lookup': {
                    'from': myCollection,
                    'let': { 'idPai': '$_id' },
                    'pipeline': [
                        { '$match': { '$expr': { '$eq': ['$tipo', 'RelacionamentoDeEntidade'] } } },
                        { '$match': { '$expr': { '$or': [{ '$eq': ['$dados.IdEntidadeA', '$$idPai'] }, { '$eq': ['$dados.IdEntidadeB', '$$idPai'] }] } } }
                        , {
                            '$lookup': {
                                'from': myCollection,
                                'let': { 'idEntidadeA': '$dados.IdEntidadeA' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'EntidadeCatalogo'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idEntidadeA'] } } },
                                    { '$replaceRoot': { 'newRoot': '$dados' } },
                                    { '$project': { 'nome': 1, 'rotuloInterface': 1 } }
                                ],
                                'as': 'EntidadeA'
                            }
                        }
                        , {
                            '$lookup': {
                                'from': myCollection,
                                'let': { 'idEntidadeB': '$dados.IdEntidadeB' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'EntidadeCatalogo'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idEntidadeB'] } } },
                                    { '$replaceRoot': { 'newRoot': '$dados' } },
                                    { '$project': { 'nome': 1, 'rotuloInterface': 1 } }
                                ],
                                'as': 'EntidadeB'
                            }
                        }
                    ],
                    'as': 'Relacionamentos'
                }
            }
            // Campos de Entidade
            , {
                '$lookup': {
                    'from': myCollection,
                    'let': { 'idPai': '$_id' },
                    'pipeline': [
                        { '$match': { '$expr': { '$eq': ['$tipo', 'CampoDeEntidade'] } } },
                        { '$match': { '$expr': { '$eq': ['$dados.EntidadeCatalogoId', '$$idPai'] } } }
                        //Tipo do Campo 
                        , {
                            '$lookup': {
                                'from': myCollection,
                                'let': { 'idTipo': '$dados.TipoCatalogoId' },
                                'pipeline': [
                                    { '$match': { '$expr': { '$eq': ['$tipo', 'TipoCatalogo'] } } },
                                    { '$match': { '$expr': { '$eq': ['$_id', '$$idTipo'] } } }
                                ],
                                'as': 'Tipo'
                            }
                        }
                    ],
                    'as': 'Campos'
                }
            }
        ]

        ;

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);

    return myPromise;

    /*myPromise.then((data) => {
        return data[0];
    }).catch((err) => {
        return null;
    });*/

}

function orderArrayByIndex(theArrayNomeOrder, maxIndex) {
    var auxKeys = theArrayNomeOrder.keys();
    var theArray2 = Array(maxIndex + 1).fill("NADA!");
    for (let i = 0; i < theArrayNomeOrder.length; i++) {
        var aux = theArrayNomeOrder[i];        
        var campo = Object.keys(aux)[0];
        var ordem = Number.parseInt(Object.values(aux)[0]);
        theArray2[ordem] = campo;
    }
    var theArray3 = [];
    for (let i = 0; i < theArray2.length; i++) {
        if (theArray2[i] != "NADA!") {
            theArray3.push(theArray2[i]);
        }
    }
    return theArray3;
}

function updateAccordion(accordionsEntity, accordion, theOrder) {
    if (accordion != null && accordion != "") {
        let auxAchou = false;
        for (let k = 0; k < accordionsEntity.length; k++) {
            let auxAcc = accordionsEntity[k];
            if (auxAcc.startsWith(accordion)) {
                auxAchou = true;
                let auxAcc2 = auxAcc.split(";")[1];
                let auxAccStart = Number.parseInt(auxAcc2.split("-")[0]);
                let auxAccEnd = Number.parseInt(auxAcc2.split("-")[1]);
                if (theOrder > auxAccEnd) {
                    auxAccEnd = theOrder;
                }
                else if (theOrder < auxAccStart) {
                    auxAccStart = theOrder;
                }
                accordionsEntity[k] = accordion + ";" + auxAccStart + "-" + auxAccEnd;
            }
        }
        if (auxAchou == false) {
            accordionsEntity.push(accordion + ";" + theOrder + "-" + theOrder);
        }
    }
}

function gerarJsonEntityFakeNN(nomeEntidadeA, nomeEntidadeB,nomeRelacionamento,rotuloInterface,rotuloInterfaceA,rotuloInterfaceB) {

    var fakeEntity = {};
    var nomeEntidade = nomeRelacionamento;

    

    var idEntidadeA = "Cadastrar" + nomeEntidadeA + "E";
    var idEntidadeB = "Cadastrar" + nomeEntidadeB + "E";

    fakeEntity["id"] = "Cadastrar" + nomeEntidade + "E";
    fakeEntity["tipo"] = "entity";
    fakeEntity["urlObter"] = "/api/Obter/?Tipo_Id=" + nomeEntidade + "_";
    fakeEntity["urlApagar"] = "/api/Delete/?Tipo_Id=" + nomeEntidade + "_";
    fakeEntity["urlLoadObjetos"] = "/api/Listar?qualEntidade=" + nomeEntidade + "&pageSize=";
    fakeEntity["urlCount"] = "/api/Count?qualEntidade=" + nomeEntidade;
    fakeEntity["urlIncluir"] = "/api/Incluir";
    fakeEntity["urlAlterar"] = "/api/Alterar";
    fakeEntity["nomeEntidade"] = nomeEntidade;
    fakeEntity["nome"] = rotuloInterface;    
    fakeEntity["camposFormObjetoOrder"]=["1","2","3"];
    fakeEntity["camposFormObjeto"] = ["#IdObjeto", "#" + nomeEntidadeA + "Id", "#" + nomeEntidadeB + "Id"];
    fakeEntity["labelsFormObjeto"] = ["C\u00f3digo", rotuloInterfaceA, rotuloInterfaceB]; //Equivalente a C�digo unicode � = \u00f3
    fakeEntity["readOnlyFormObjeto"] = ["readOnly"];
    fakeEntity["inputFieldFormObjeto"] = ["<input type=\"text\"", "<input type=\"text\"", "<input type=\"text\""];
    fakeEntity["campoObjetoId"] = nomeEntidade + "Id"
    fakeEntity["camposObjeto"] = [fakeEntity["campoObjetoId"], nomeEntidadeA + "Id", nomeEntidadeB + "Id"];    
    fakeEntity["camposListagemObjeto"] = [nomeEntidadeA + "Id", nomeEntidadeB + "Id"];        
    fakeEntity["camposFormClassObjeto"] = ["form-control", "form-control", "form-control"];
    fakeEntity["tipoCamposObjeto"] = ["objectid", "objectid", "objectid"];
    fakeEntity["chooseFormObjeto"] = ["",idEntidadeA,idEntidadeB];
    fakeEntity["IdToViewObjeto"] = ["", idEntidadeA, idEntidadeB];

    

    return fakeEntity;
}

function getTagInput(tagInput,tipoCampo) {
    if (tagInput == null || tagInput == "") {
        if (tipoCampo == "boolean") {
            return "<input type=\"checkbox\" value=\"true\"";
        }
        else {
            return "<input type=\"text\"";
        }
    }
    else {
        return tagInput;
    }
}

function handleGeraJsonEntity(data,nomeEntidade) {
    //myPromise.then((data) => {
    var theJson = data[0];
    var theEntity = {};
    var textEntity = "";
    
    theEntity["id"] = "Cadastrar" + nomeEntidade + "E";
    theEntity["tipo"] = "entity";
    theEntity["urlObter"] = "/api/Obter/?Tipo_Id=" + nomeEntidade + "_";
    theEntity["urlApagar"] = "/api/Delete/?Tipo_Id=" + nomeEntidade + "_";
    theEntity["urlLoadObjetos"] = "/api/Listar?qualEntidade=" + nomeEntidade + "&pageSize=";
    theEntity["urlCount"] = "/api/Count?qualEntidade=" + nomeEntidade;
    theEntity["urlIncluir"] = "/api/Incluir";
    theEntity["urlAlterar"] = "/api/Alterar";
    theEntity["nomeEntidade"] = nomeEntidade;
    theEntity["nome"] = theJson.dados.rotuloInterface;
    //Pegar uma lista dos campos da entidade bem como de seus r�tulos
    theEntity["camposFormObjeto"] = ["#IdObjeto"];
    theEntity["labelsFormObjeto"] = ["C\u00f3digo"]; //Equivalente a C�digo unicode � = \u00f3
    theEntity["readOnlyFormObjeto"] = ["readOnly"];
    theEntity["inputFieldFormObjeto"] = ["<input type=\"text\""];
    theEntity["campoObjetoId"] = nomeEntidade + "Id"
    theEntity["camposObjeto"] = [theEntity["campoObjetoId"]];
    var arrayCampos = theJson.Campos;
    theEntity["camposListagemObjeto"] = [];
    var OrderCampos = [0];
    theEntity["camposFormObjetoOrder"] = ["1"];
    theEntity["camposFormClassObjeto"] = ["form-control"];
    theEntity["tipoCamposObjeto"] = ["objectid"];
    theEntity["chooseFormObjeto"] = [""];
    theEntity["IdToViewObjeto"] = [""];
    theEntity["accordions"] = [];

    var fakeEntity = null;                                                           
    var auxOrderArray = new Array(arrayCampos.length + 1 + theJson.Relacionamentos.length);
    for (let k = 0; k < auxOrderArray.length; k++) { auxOrderArray[k] = -1/*(k + 1)*/; }
    for (let i = 0; i < arrayCampos.length; i++) {
        var nomeCampo = arrayCampos[i].dados.nome;
        var rotuloCampo = arrayCampos[i].dados.rotuloDeInterface;
        var tipoCampo = arrayCampos[i].Tipo[0].dados.tipo;
        var tagInput = arrayCampos[i].dados.tagInput;
        var campoDeListagem = arrayCampos[i].dados.campoDeListagem;

        //Ordem e Accordions
        var theOrder = Number.parseInt(arrayCampos[i].dados.ordem) + 1;
        var accordion = arrayCampos[i].dados.accordion;
        var accordionsEntity = theEntity["accordions"];
        auxOrderArray[theOrder - 1] = i + 2; // Onde o campo quer estar
        updateAccordion(accordionsEntity, accordion, theOrder);
        OrderCampos.push(theOrder);
        theEntity["camposFormObjetoOrder"].push((theOrder).toString());
        //Fim Ordem e Accordions
        
        theEntity["camposFormObjeto"].push("#" + nomeCampo);
        theEntity["labelsFormObjeto"].push(rotuloCampo);
        theEntity["readOnlyFormObjeto"].push("");
        theEntity["camposFormClassObjeto"].push("form-control");
        theEntity["tipoCamposObjeto"].push(tipoCampo);
        theEntity["chooseFormObjeto"].push("");
        theEntity["IdToViewObjeto"].push("");            

        theEntity["inputFieldFormObjeto"].push(getTagInput(tagInput, tipoCampo));
        theEntity["camposObjeto"].push(nomeCampo);
        if (campoDeListagem == "true") {
            var aux = { [nomeCampo]: theOrder }
            theEntity["camposListagemObjeto"].push(aux);
        }
    }
    
     

    /* Removido em 28112020
     * //Ordernar o array camposListagemObjeto para que corresponder � ordem de OrdemCampos
     * theEntity["camposListagemObjeto"] = orderArrayByIndex(theEntity["camposListagemObjeto"], OrderCampos.length);
     * for (let k = 0; k < auxOrderArray.length; k++) {
        theEntity["camposFormObjetoOrder"][k] = (auxOrderArray[k]).toString();
    }*/
        

    //Agora tenho que incorporar os relacionamentos onde a outra entidade � do tipo "0-1"
    var arrayRelacionamentos = theJson.Relacionamentos;   
    for (let i = 0; i < arrayRelacionamentos.length; i++) {
        var nomeRelacionamento = arrayRelacionamentos[i].dados.nome;
        var rotuloInterface = arrayRelacionamentos[i].dados.rotuloInterface;
        var rotuloInterfaceA = arrayRelacionamentos[i].EntidadeA[0].rotuloInterface;
        var rotuloInterfaceB = arrayRelacionamentos[i].EntidadeB[0].rotuloInterface;
        var EntidadeA = arrayRelacionamentos[i].EntidadeA[0].nome;
        var EntidadeB = arrayRelacionamentos[i].EntidadeB[0].nome;
        var CardinalidadeA = arrayRelacionamentos[i].dados.CardinalidadeEntidadeA;
        var CardinalidadeB = arrayRelacionamentos[i].dados.CardinalidadeEntidadeB;
        var rotuloA = arrayRelacionamentos[i].EntidadeA[0].rotuloInterface;
        var rotuloB = arrayRelacionamentos[i].EntidadeB[0].rotuloInterface;
        var CardinalidadeEntidade = (EntidadeA == nomeEntidade) ? CardinalidadeA : CardinalidadeB;
        var CardinalidadeOutraEntidade = (EntidadeA == nomeEntidade) ? CardinalidadeB : CardinalidadeA;
        var nomeOutraEntidade = (EntidadeA == nomeEntidade) ? EntidadeB : EntidadeA;
        var rotuloOutra = (EntidadeA == nomeEntidade) ? rotuloB : rotuloA;
        var idOutra = "Cadastrar" + nomeOutraEntidade + "E";
        var ObjetoIdOutra = nomeOutraEntidade + "Id";

        if (
            ((CardinalidadeEntidade == "0-*" || CardinalidadeEntidade == "1-*")
                && (CardinalidadeOutraEntidade == "0-1" || CardinalidadeOutraEntidade == "1")) ||
            ((CardinalidadeEntidade == "0-1") && (CardinalidadeOutraEntidade == "1"))
        ) {

            /*
            Temos dois casos:
            (1) 0-*, 1-* -> 0-1 ou 1... Muitos para um... A entidade em an�lise herda o id da outra entidade;
            (2) 0-1->1 Relacionamento 1 para um, discutido abaixo...
    
            Aqui os dois podem incorporar o id da outra entidade. Como saber quem vai ficar com a chave estrangeira?
            F�cil: N�o podemos ter "0-1":"0-1". Podemos ter s� "1":"0-1" ou "0-1":"1"!
            A entidade que n�o pode existir sem a outra fica com o id estrangeiro da outra entidade!
            Outra solu��o: Indicar quem � a entidade fraca no relacionamento. A entidade fraca herda a chave estrangeira.
    
            N�o podemos ter as duas entidades fracas ao mesmo tempo. Somente uma tem a chave estrangeira da outra.
            � claro que no caso de relacionamento n para n a coisa muda de conversa.
    
            Decis�o: Por defini��o do sistema n�o existe 0-1:0-1. Existe somente 0-1:1 ou 1:0-1. Quem tem 0-1 � a entidade fraca!
    
            Desse modo, eu s� tenho que me preocupar, para a entidade em an�lise, com o caso onde ela � 0-1 e a outra � 1!
    
            Em tal caso, devo incorporar o id da outra entidade!
            */

            //Tenho que incorporar o campo id da outra entidade!   
            //theEntity["camposFormObjetoOrder"].push((theEntity["camposFormObjetoOrder"].length+1).toString());
            theEntity["camposFormObjeto"].push("#" + ObjetoIdOutra);
            //theEntity["labelsFormObjeto"].push(rotuloOutra);
            theEntity["labelsFormObjeto"].push(rotuloInterface);
            theEntity["readOnlyFormObjeto"].push("readOnly");
            theEntity["camposFormClassObjeto"].push("form-control");
            //theEntity["tipoCamposObjeto"].push("text");
            theEntity["tipoCamposObjeto"].push("objectid");
            theEntity["chooseFormObjeto"].push(idOutra);
            theEntity["IdToViewObjeto"].push(idOutra);
            theEntity["inputFieldFormObjeto"].push("<input type=\"text\"");
            theEntity["camposObjeto"].push(ObjetoIdOutra);

            //Ordem e Accordions
            //var theOrder = arrayCampos.length + i + 2;
            var theOrder = (theEntity["camposFormObjetoOrder"].length) + 1;
            if (arrayRelacionamentos[i].dados.ordem != null && arrayRelacionamentos[i].dados.ordem != "") {
                theOrder = Number.parseInt(arrayRelacionamentos[i].dados.ordem) + 1;
            }            
            var accordion = arrayRelacionamentos[i].dados.accordion;
            var accordionsEntity = theEntity["accordions"];
            //auxOrderArray[theOrder - 1] = arrayCampos.length + i + 2; // Onde o campo quer estar
            auxOrderArray[theOrder - 1] = (theEntity["camposFormObjetoOrder"].length) + 1;
            updateAccordion(accordionsEntity, accordion, theOrder);
            OrderCampos.push(theOrder);
            theEntity["camposFormObjetoOrder"].push((theOrder).toString());
            //Fim Ordem e Accordions

        }
        else if ((CardinalidadeEntidade == "0-*") && (CardinalidadeOutraEntidade == "1-*")) {
            /*
                * Aqui tenho que gerar uma entidade fake, que guarda as chaves estrangeiras das duas entidades!
                * 
                * Como n�o fazer isto de forma duplicada ? Podemos adotar o mesmo crit�rio anterior, isto �:
                * 
                * ===> N�o existe 0-*:0*, nem 1-*:1-*. S� existe 0-*:1-* ou 1-*:0-*. Quem tem 0-* � a entidade fraca respons�vel
                * por gerar a entidade fake.
                *
                * Logo s� temos que nos preocupar para o caso que entidade em an�lise tem cardinalidade 0-*, caso em que geraremos a entidade
                * fake!
                * 
                */
            fakeEntity = gerarJsonEntityFakeNN(EntidadeA, EntidadeB, nomeRelacionamento, rotuloInterface,rotuloInterfaceA,rotuloInterfaceB)
            textEntity += (textEntity == "") ? "" : ",";
            textEntity += (fakeEntity == null) ? "" : JSON.stringify(fakeEntity);                    
        }
    }

    //Inclus�o em 28112020
    //Ordernar o array camposListagemObjeto para que corresponder � ordem de OrdemCampos
    theEntity["camposListagemObjeto"] = orderArrayByIndex(theEntity["camposListagemObjeto"], OrderCampos.length);

    for (let k = 0; k < auxOrderArray.length; k++) {
        if (auxOrderArray[k] != -1) {
            theEntity["camposFormObjetoOrder"][k] = (auxOrderArray[k]).toString();
        }        
    }
    //Fim inclus�o 28112020

    textEntity += (textEntity == "") ? "" : ",";
    textEntity += JSON.stringify(theEntity);
    return textEntity;   

}

function geraJsonEntity(urlMongo, myDB, myCollection,nomeEntidade) {

    /*Tenho que gerar o seguinte json(modelo):
     *      
      "id": "CadastrarTipoCatalogE", (OK)
      "nome": "Cat�logo de Tipos", (OK)
      "tipo": "entity", (OK)
      "urlObter": "/api/Obter/?Tipo_Id=TipoCatalogo_", (OK)
      "urlApagar": "/api/Delete/?Tipo_Id=TipoCatalogo_", (OK)
      "urlLoadObjetos": "/api/Listar?qualEntidade=TipoCatalogo&pageSize=",(OK)
      "urlCount": "/api/Count?qualEntidade=TipoCatalogo",(OK)
      "urlIncluir": "/api/Incluir",(OK)
      "urlAlterar": "/api/Alterar",(OK)
      "camposFormObjeto": [ "#IdObjeto", "#tipoCatalogo", "#descricao" ], (OK)
      "labelsFormObjeto": [ "C�digo", "Tipo", "Descri��o" ], (OK)
      "readOnlyFormObjeto": [ "readOnly", "", "" ],(OK)
      "inputFieldFormObjeto": [ "<input type=\"text\"", "<input type=\"text\"", "<input type=\"text\"" ], (OK)
      "camposObjeto": [ "TipoCatalogoId", "tipo", "descricao" ],(OK)
      "campoObjetoId": "TipoCatalogoId", (OK)
      "camposListagemObjeto": [  "tipo" ], (OK)
      "camposFormClassObjeto": [ "form-control", "form-control", "form-control" ],(OK)
      "nomeEntidade": "TipoCatalogo", (OK)
      "tipoCamposObjeto": [ "text", "text", "text" ],(OK)
      "chooseFormObjeto": [ "", "", "" ] (OK)
     * */


    //Pegar o json da entidade no mongo !
    var myPromise = getJSONEntidadeFromCatalogo(urlMongo, myDB, myCollection, nomeEntidade);

    return myPromise;

//    var theJson = getJSONEntidadeFromCatalogo(urlMongo, myDB, myCollection, nomeEntidade);

}

function getEntidades(urlMongo, myDB, myCollection) {
    var theQuery = [
        { '$match': { 'tipo': 'EntidadeCatalogo' } },
        { '$group': { '_id': '$dados.nome' } }
    ]

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);
    return myPromise;
}

async function geraMenuBar(urlMongo, myDB, myCollection, IdPai) {


    var MyHierarquia = await geraJsonInterfaceMenuItens(urlMongo, myDB, myCollection, null);
    var MenuBar = {
        'id': 'MainMenuBar',
        'descri\u00e7\u00e3o': 'Menu Principal - Sistema J\u00E1',
        'maxItensPerLine': 7,
        'Hierarquia': MyHierarquia
    };
    return MenuBar;
}

async function geraJsonInterfaceMenuItens(urlMongo, myDB, myCollection,IdPai) {
    /*
     * 
     * Tenho que gerar algo do tipo, baseando-se nos menus itens cadastrados do cat�logo. Cada menu item � associado a um item
     * de interface (id de interface). Um menu item pode ter um menu pai, e um nome.
     * Se um menu item tem um pai, significa que ele est� dentro de um menu. Se o menu item n�o tem pai, ele faz parte do n�vel zero
     * da hierarquia de menus.
     * Se um menu item n�o est� associado a um id de interface, significa que ele � um menu pai, um menu "container" e deve ser utilizado seu
     * nome
     
    "MenuBar": {
    "id": "MainMenuBar",
    "descricao": "Menu Principal - Sistema J�",
    "maxItensPerLine": 7,
    "Hierarquia": {
      "Camada de Dados ": {
        "CadastrarTipoCatalogE": null,
        "CadastrarEntidadeE": null,
        "CadastrarCampoDeEntidadeE": null,
        "CadastrarRelacionamentoDeEntidadeE": null
      },
      "Camada de Neg�cio": {
        "CadastrarConsultaE": null
      },
      "Camada de Interface": {
        "SincronizarCatalogoWAPI": null,
        "ListarIds": null,
        "CadastrarItemMenuE": null
      }
      }
    },

Passo 1: Pegar todos os itens de menu.
Passo 2: Para cada 
     
     */
    var idAux = (IdPai == null)? null:(new ObjectId(IdPai));
    var theQuery = [{ '$match': { 'tipo': 'ItemMenu', 'dados.IdElementoPai': idAux }},{ '$sort': { 'dados.ordem': 1 }}]
    console.log("Vou rodar o query:");
    console.log(theQuery);
    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);
    let data = await myPromise;
    var auxHierarquia = {};
    var menuItens = data;
    console.log("Analisando os seguintes itens:");
    console.log(data);
    if (menuItens.length == 0) {
        console.log("Retornei null para IdPai:" + IdPai);
        return null;
    }
    else {
        var theItems = [];
        for (let i = 0; i < menuItens.length; i++) {
            let x = menuItens[i];
            let pai = x.dados.IdElementoPai;
            let theId = x.dados.IdElementoInterface;
            let nome = x.dados.nome;
            let myId = x._id;
            let aux = (theId == null && nome != null) ? nome : (theId != null) ? theId : null;
            if (aux != null) {
                auxHierarquia[aux] = null;
                theItems.push(aux);
                console.log("Registrei uma itemPromise para aux:" + aux + ", e myId:" + myId);
                var itemPromise = geraJsonInterfaceMenuItens(urlMongo, mongoDB, myCollection, myId)
                let itemResult = await itemPromise;
                auxHierarquia[aux] = itemResult;
                console.log("Promise de item retornou com auxHierarquia[" + aux + "]");
                console.log(auxHierarquia[aux]);
            }
        }
        return auxHierarquia;
    }
}
function handleGeraJsonConsulta(data, nomeConsulta) {
    
    var theJson = data[0];
    var theConsulta = {};
    var textConsulta = "";

    var listaParametros = (theJson.dados['listaParametros'] != null && theJson.dados['listaParametros'] != "") ? theJson.dados['listaParametros'].split("\n") : [];
    var listaParametrosOut = (theJson.dados['listaParametrosOut'] != null && theJson.dados['listaParametrosOut'] != "") ? theJson.dados['listaParametrosOut'].split("\n") : [];
    var campoObjetoIdOut = theJson.dados['campoObjetoIdOut'];
    var bindingStrategy = theJson.dados['bindingStrategy'];
    
    theConsulta["id"] = "Executar" + nomeConsulta + "_Consulta";
    theConsulta["tipo"] = "webapiDialog";
    theConsulta["urlApi"] = "/api/ExecutarConsulta?nome=" + nomeConsulta;    
    theConsulta["nome"] = theJson.dados.nome;
    theConsulta["httpMethod"] = "GET";
    theConsulta["bindingStrategy"] = (bindingStrategy == null || bindingStrategy =="")? "ListPageFilter" : bindingStrategy;
    theConsulta["bindingParameters"] = {};
    theConsulta["bindingParameters"]["directPagination"] = "true";
    theConsulta["nomeBotao"] = theJson.dados.rotuloInterface;

    //the campos in s�o os par�metros !
    theConsulta["in"] = null;
    for (let i = 0; i < listaParametros.length; i++) {  
        if (i == 0) {
            theConsulta["in"] = {};
            theConsulta["in"]["camposFormObjeto"] = [];
            theConsulta["in"]["labelsFormObjeto"] = [];
            theConsulta["in"]["readOnlyFormObjeto"] = [];
            theConsulta["in"]["inputFieldFormObjeto"] = [];
            theConsulta["in"]["camposObjeto"] = [];
            theConsulta["in"]["campoObjetoId"] = null;
            theConsulta["in"]["camposFormClassObjeto"] = [];
            theConsulta["in"]["tipoCamposObjeto"] = [];
            theConsulta["in"]["chooseFormObjeto"] = [];
            theConsulta["in"]["accordions"] = null;
            theConsulta["in"]["camposFormObjetoOrder"] = null;
        }
        theConsulta["in"]["camposFormObjeto"].push("#"+ listaParametros[i]);
        theConsulta["in"]["labelsFormObjeto"].push(listaParametros[i]);
        theConsulta["in"]["readOnlyFormObjeto"].push("");
        theConsulta["in"]["inputFieldFormObjeto"].push("<input type=\"text\"");
        theConsulta["in"]["camposObjeto"].push(listaParametros[i]);
        theConsulta["in"]["camposFormClassObjeto"].push("form-control");
        theConsulta["in"]["tipoCamposObjeto"].push("text");
        theConsulta["in"]["chooseFormObjeto"].push("");
    }
    //Agora campos out!
    theConsulta["out"] = null;
    for (let i = 0; i < listaParametrosOut.length; i++) {
        if (i == 0) {
            theConsulta["out"] = {};
            theConsulta["out"]["camposFormObjeto"] = [];
            theConsulta["out"]["labelsFormObjeto"] = [];
            theConsulta["out"]["readOnlyFormObjeto"] = [];
            theConsulta["out"]["inputFieldFormObjeto"] = [];
            theConsulta["out"]["camposObjeto"] = [];            
            theConsulta["out"]["camposFormClassObjeto"] = [];
            theConsulta["out"]["tipoCamposObjeto"] = [];
            theConsulta["out"]["chooseFormObjeto"] = [];
            theConsulta["out"]["accordions"] = null;
            theConsulta["out"]["camposFormObjetoOrder"] = null;
            theConsulta["out"]["camposListagemObjeto"] = [];
            theConsulta["out"]["campoObjetoId"] = campoObjetoIdOut;
        }
        theConsulta["out"]["camposFormObjeto"].push("#" + listaParametrosOut[i]);
        theConsulta["out"]["labelsFormObjeto"].push(listaParametrosOut[i]);
        theConsulta["out"]["readOnlyFormObjeto"].push("readOnly");
        theConsulta["out"]["inputFieldFormObjeto"].push("<input type=\"text\"");
        theConsulta["out"]["camposObjeto"].push(listaParametrosOut[i]);
        theConsulta["out"]["camposFormClassObjeto"].push("form-control");
        theConsulta["out"]["tipoCamposObjeto"].push("text");
        theConsulta["out"]["camposListagemObjeto"].push(listaParametrosOut[i]);
        theConsulta["out"]["chooseFormObjeto"].push("");
    }
    textConsulta += (textConsulta == "") ? "" : ",";
    textConsulta += JSON.stringify(theConsulta);
    return textConsulta;
}


function getConsultas(urlMongo, myDB, myCollection) {
    var theQuery = [
        { '$match': { 'tipo': 'ConsultaDados' } },
        { '$group': { '_id': '$dados.nome' } }
    ]

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);
    return myPromise;

}


function getJSONConsultaFromCatalogo(urlMongo, myDB, myCollection, nomeConsulta) {
    var myCatalog = myCollection;

    var theQuery =

        [
            {
                // Entidade Catalogo
                '$match': {
                    'tipo': 'ConsultaDados',
                    'dados.nome': nomeConsulta
                }
            }
        ]

        ;

    var myPromise = aggregateJSON(urlMongo, myDB, myCollection, theQuery);

    return myPromise;    

}



function geraJsonConsulta(urlMongo, myDB, myCollection, nomeConsulta) {
    //Pegar o json da consulta no mongo !
    var myPromise = getJSONConsultaFromCatalogo(urlMongo, myDB, myCollection, nomeConsulta);
    return myPromise;
}

function geraJsonConsultas(urlMongo, myDB, myCollection)
{
    var promise = new Promise((resolve, reject) => {
        var myPromise = getConsultas(urlMongo, myDB, myCollection);
        myPromise.then((data) => {
            var consultas = data;
            var auxText = "[";
            var myPromiseArray = new Array(consultas.length);
            for (let k = 0; k < consultas.length; k++) {
                var nomeConsulta = consultas[k]["_id"];
                myPromiseArray[k] = geraJsonConsulta(urlMongo, myDB, myCollection, nomeConsulta);
            }
            //Agora vou executar minhas promisses!
            Promise.all(myPromiseArray).then(values => {
                for (let i = 0; i < values.length; i++) {
                    console.log("Promise.all[" + i + "].values[" + i + "]");
                    console.log(values[i]);
                    console.log("consultas[" + i + "]:");
                    console.log(consultas[i]);
                    var myObject = handleGeraJsonConsulta(values[i], consultas[i]["_id"]);
                    auxText += (auxText == "[") ? "" : ",";
                    auxText += myObject;
                    console.log("Terminei com i:" + i);
                }
                resolve('"webapiDialogs":' + auxText + "]");
            }).catch((err4) => { reject(err4);});
        }).catch((err) => {
            reject(err);
        });
    });
    return promise;
}


function geraJsonWebApiEntities(urlMongo, myDB, myCollection) {
    var promise = new Promise((resolve, reject) => {       
        var myPromise = getEntidades(urlMongo, myDB, myCollection);
        myPromise.then((data) => {
            var entidades = data;
            var auxText = "[";
            var myPromiseArray = new Array(entidades.length);
            var myPromiseArray2 = new Array(entidades.length);
            for (let k = 0; k < entidades.length;k++) {
                var nomeEntidade = entidades[k]["_id"];
                myPromiseArray[k] = geraJsonEntity(urlMongo, myDB, myCollection, nomeEntidade);
            }
            //Agora vou executar minhas promisses!
            Promise.all(myPromiseArray).then(values => {
                for (let i = 0; i < values.length; i++) {   
                    var myObject = handleGeraJsonEntity(values[i], entidades[i]["_id"]);
                    auxText += (auxText == "[") ? "" : ",";
                    auxText += myObject;
                    //auxText += (auxText == "") ? "{" : ",";
                    //auxText += handleGeraJsonEntity(values[i], entidades[i]["_id"]);
                }
                resolve('"entities":'+ auxText+"]");
            });
        }).catch((err) => {
            reject(err);
        });
    });
    return promise;
}


function queryJSON(url, myDB, theCollection, theQuery, pageSize, filtro) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);
            var theLimit = Number.parseInt(pageSize);
            dbo.collection(theCollection).find(theQuery).limit(theLimit).toArray(function (err, result) {
                //var myReturn = JSON.stringify(result);
                var myReturn = result;
                db.close();
                resolve(myReturn);
            });
        });
    });

    return promise;
}

function queryOneJSON(url, myDB, theCollection, theQuery) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            var dbo = db.db(myDB);            
            dbo.collection(theCollection).findOne(theQuery,function (err, result) {                
                var myReturn = result;
                db.close();
                resolve(myReturn);
            });
        });
    });

    return promise;
}

function getJsonCalObjectID(theValue) {
    if (theValue.indexOf('CalcObjectID("') == 0) {

        var theId = replaceCalcObjectID(theValue);       
        var x = new ObjectId(theId);
        
        return x;
    }

    return theValue;
}

function replaceCalcObjectID(theValue) {
    if (theValue.startsWith('CalcObjectID("') && theValue.endsWith('")')) {
        var t1 = 'CalcObjectID("'.length;
        var t2 = '")'.length;
        var t3 = theValue.length;
        return theValue.substring(t1, t3 - 2);
    }
    else if (theValue.startsWith("CalcObjectID('") && theValue.endsWith("')")) {
        var t1 = "CalcObjectID('".length;
        var t2 = "')".length;
        var t3 = theValue.length;
        return theValue.substring(t1, t3 - 2);

    }
    return theValue
}

function traverseJsonToCalcObjectId(jsonObj, myKeyPath) {

    if (jsonObj !== null && typeof jsonObj == "object") {
        var arrayKeys = Object.keys(jsonObj);
        var arrayValues = Object.values(jsonObj);
        for (var i = 0; i < arrayKeys.length; i++) {
            var key = arrayKeys[i];
            var theKeyPath = "";

            if (isNaN(parseInt(key)) == false) {
                theKeyPath = myKeyPath + "[" + key + "]";
            }
            else {
                theKeyPath = myKeyPath + '["' + key + '"]';
            }
            var theValue = arrayValues[i];

            if (typeof theValue == "string") {
                if (theValue.indexOf('CalcObjectID("') == 0 || theValue.indexOf("CalcObjectID('") == 0) {
                    console.log("myKeyPath:" + theKeyPath + "=" + theValue);
                    //Vamos calcular o ID aqui!
                    var theId = replaceCalcObjectID(theValue);

                    console.log("theId:" + theId);
                    var x = new ObjectId(theId);
                    console.log(x);
                    jsonObj[key] = x;
                }
            }
            else {
                traverseJsonToCalcObjectId(theValue, theKeyPath); 
            }
        }
    }
}


function queryCount(url, myDB, theCollection, theQuery) {
    var promise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            //console.log("queryCount:theQuery:");
            //console.log(theQuery);
            var dbo = db.db(myDB);
            dbo.collection(theCollection).find(theQuery).count(function (err, result) {
                var myReturn = result;
                db.close();
                resolve(myReturn);
            });
        });
    });

    return promise;
}

async function getJsonFromUrl(theURL) {    

    var myPromise = new Promise((resolve, reject) => {
        axios({
            method: 'get',
            url: theURL
        }).then((response) => {
            //console.log(response);
            resolve(response.data);
        }).catch((error) => {
            reject(error);
        });
    });
    return myPromise;

}
