const express = require('express');
const fs = require('fs');
const https = require('https');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const openSSLPATH = "openssl";

//Biblioteca local
const mygenfunctions = require('./genericfunctions.js');


var jsonParser = bodyParser.json();

const server_key = 'server_key.pem';
const server_cert = 'server_cert.pem';
const issuer_cert = 'brasilv5.cer';
const myconfsFile = 'confsApp.json';
const validUrls = [
    "/",
    "/lib/libs/",
    "/css/",
    "/svg/",
    "/authenticate",
    "/NaoLogado.html",
    "/Autenticar.html",
    "/Logout.html",
    "/myDataHost",
    "/myCertHost",
    "/myLoginHost",
    "/js/miniUtils.js",
    "/ico/",
    "/myModulos"
]

let privateKey = fs.readFileSync(server_key)
let publicKey = fs.readFileSync(server_cert);



const myconf = JSON.parse(fs.readFileSync(myconfsFile));
const portLoginApp = myconf['portLoginApp'];
const portMasterApp = myconf['portMasterApp'];
const urlAppData = myconf['urlAppData'];
const urlCertHost = myconf['urlCertHost'];
const urlLoginHost = myconf['urlLoginHost'];
const modulosInterfaces = myconf['modulos'];
const nomeSistema = myconf['nomeSistema'];
const urlAppMiddleWare = myconf['urlAppMiddleWare'];



const opts = {
    key: fs.readFileSync(server_key )
    , cert: fs.readFileSync(server_cert)
    , requestCert: true
    , rejectUnauthorized: false
    , ca: [fs.readFileSync(issuer_cert)]
}

const app = express();

app.use(cors()); //Habilita cors para todas as origens - No futuro, fazer restrições por origem!

//Sessões ---
app.use(cookieParser());
app.use(session({ secret: "Shh, its a secret!" }));
//----

app.get('/', (req, res) => {    
    res.redirect('/logout');
});

app.use(verifyJWT, express.static('wwwroot'));

app.get('/logout', (req, res) => {        
    logout(req, res);
});


app.get('/myToken', (req, res) => { sendMySessionToken(req, res); });

app.get('/myDataHost', (req, res) => {
    res.status(200).json({ 'urlDataHost': urlAppData });
});
app.get('/myCertHost', (req, res) => {
    res.status(200).json({ 'urlCertHost': urlCertHost});
});

app.get('/myLoginHost', (req, res) => {
    res.status(200).json({ 'urlLoginHost': urlLoginHost });
});
 

app.post('/authenticate', (req, res) => {       
    const cert = req.connection.getPeerCertificate();
    if (req.client.authorized) {
        var subjectaltname = cert.subjectaltname;
        var myPromise = new Promise((resolve, reject) => {
            try {
                resolve(mygenfunctions.certDetails(cert,openSSLPATH));
            }
            catch (err) {
                reject(err);
            }            
        });

        myPromise.then((data) => {
            var theArray = data;
            var userToken = mygenfunctions.geraToken(theArray,privateKey);
            //var decoded = decodeToken(userToken);
            if (theArray != null) {
                //Autentica o token
                var myPromise2 = autenticaLogin(userToken,req,res);
                myPromise2.then((data2) => {
                    if (data2 == true) {
                        res.status(200).json(userToken);
                    }
                    else {
                        res.status(401).json({ 'mensagem': 'Erro de autenticação!' });
                        res.redirect('/Logout.html');
                    }
                }).catch((err2) => {
                    res.status(401).json({ 'mensagem': 'Erro de autenticação!' });
                    res.redirect('/Logout.html');
                })  
               // res.status(200).json(userToken);
            }
            else {
                res.status(401)
                    .send(`Erro de autenticação!`);
            }
        }).catch((err) => {
            res.status(401)
                .send(`Erro de autenticação!`);
        });
       
        //res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`);

    } else if (cert.subject) {
        res.status(403)
            .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`);
    } else {
        res.status(401)
            .send(`Sorry, but you need to provide a client certificate to continue.`);
    }
});

https.createServer(opts, app).listen(portMasterApp);

//----------------- Login --------------------------------------------
const optsLogin = {
    key: fs.readFileSync(server_key)
    , cert: fs.readFileSync(server_cert)
}

const loginApp = express();

loginApp.use(cors());
loginApp.use(cookieParser());
loginApp.use(session({ secret: "Shh, its a secret!" }));
//loginApp.use(verificaLoginApp, express.static('wwwroot'));
loginApp.use(verifyJWT, express.static('wwwroot'));

loginApp.get('/logout', (req, res) => { logout(req, res); });
loginApp.get('/myToken', (req, res) => { sendMySessionToken(req, res); });

loginApp.get('/myDataHost', (req, res) => {
    res.status(200).json({ 'urlDataHost': urlAppData });
});

loginApp.get('/',(req,res)=>{    
    let myLoginHtml = fs.readFileSync('wwwroot/Login.html');
    //console.log("Entrei aqui!")
    myLoginHtml = myLoginHtml.toString().replace(/###NOME_SISTEMA###/g,nomeSistema);
    res.set('Content-Type', 'text/html');
    res.send(myLoginHtml);

});


loginApp.get('/myCertHost', (req, res) => {
    res.status(200).json({ 'urlCertHost': urlCertHost });
});

loginApp.get('/myLoginHost', (req, res) => {
    res.status(200).json({ 'urlLoginHost': urlLoginHost });
});

loginApp.get('/myModulos', (req, res) => {
    //console.log(modulosInterfaces)
    res.status(200).json({ 'modulos': modulosInterfaces });
});

loginApp.get('/myNomeSistema', (req, res) => {
    //console.log(modulosInterfaces)
    res.status(200).json({ 'nomeSistema': nomeSistema });
});

loginApp.post('/authenticateWithoutSmart', jsonParser,  (req, res) => {
    // --- Autenticação sem smartCard -------------------   
    var theBody = req.body;
    //console.log(theBody);
    if (theBody['Email'] == null || theBody['Email'] == "" || theBody['password'] == null && theBody['password'] == ""
        || theBody['semSmartCard'] == null || theBody['semSmartCard'] == "") {
        res.status(401).send('Faltaram dados!');
    }
    else {
        var myJson = theBody;
        var tokenValida = mygenfunctions.geraToken(myJson,privateKey);
        //console.log(tokenValida);
        var myPromise = autenticaLogin(tokenValida,req,res);
        myPromise.then((data) => {
            if (data == true) {
                myJson['password'] = '' //Não podemos colocar a senha no webtoken!
                var userToken = mygenfunctions.geraToken(myJson,privateKey);
                res.status(200).json(userToken);
            }
            else {
                res.status(401).json({ 'mensagem': 'Erro de autenticação!' });
                //res.redirect('/Logout.html');ddd
            }
        }).catch((err) => {
            res.status(401).json({ 'mensagem': 'Erro de autenticação!' });
            //res.redirect('/Logout.html');
        })  
    }    
    //--------------------------
    
});

//----
console.log(`Listening ${portLoginApp}`)
https.createServer(optsLogin, loginApp).listen(portLoginApp);
//----------------- Fim Login --------------------------------------------
function verifyJWT(req, res, next){
    mygenfunctions.verifyJWT(req,res,next,validUrls,publicKey)
 } 

function logout(req,res) {
    req.session.myToken = "";
    res.redirect('/Logout.html');
}



async function autenticaLogin(tokenValida,req,res) {
    var myJson = { 'token': tokenValida }; 
    //var theURL = (urlAppData + '/validaToken');
    var theURL = (urlAppMiddleWare + '/validaToken');

    var myPromise = new Promise((resolve, reject) => {
        axios({
            method: 'post',
            url: theURL,
            data: myJson
        }).then((response) => {
            let etokenBackEnd = response.data['etoken']; 
            req.session.etokenBackEnd = etokenBackEnd; 
            resolve(true);
        }).catch((error) => {
            resolve(false);
        });
    });
    return myPromise;

}

function sendMySessionToken(req, res) {
    var token = req.session.myToken;
    if (token != null && token != "") {
        var myJson = { 'token': token };
        let etokenBackEnd = req.session.etokenBackEnd; 
        if(etokenBackEnd !== undefined && etokenBackEnd != null){
            res.status(200).json({ 'token':etokenBackEnd});
        }
        else{
            res.status(200).json({ 'token':token });
        }        
    }
    else {
        res.status(500).json({ 'mensagem': 'token insponível!' });
    }
}
