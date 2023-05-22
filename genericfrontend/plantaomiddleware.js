const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const server_key = 'server_key.pem';
const server_cert = 'server_cert.pem';
const https = require('https');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const optsHttps = {
    key: fs.readFileSync(server_key)
    , cert: fs.readFileSync(server_cert)
}


//Configurações básicas
const app = express();
const agentAxios = new https.Agent({
    rejectUnauthorized: false
});
//Sessões ---
app.use(cookieParser());
app.use(session({ secret: "What is the secret of this matter?" }));
//----

//---------- No cache! ----
const nocache = require('nocache');
const { isArray } = require('util');
app.use(nocache());
//----------- No cache! fim ---
//----------- Cors --------------------------------
app.use(cors()); //Habilita cors para todas as origens - No futuro, fazer restrições por origem!

//---Outras configurações básicas
var urlencodedParser = bodyParser.urlencoded({ extended: true });
var jsonParser = bodyParser.json();

//Configurações feitas em confsApp.json
const myconfsFile = 'confsApp.json';
const myconf = JSON.parse(fs.readFileSync(myconfsFile));

const portMiddleWare = myconf['portMiddleWare'];
const urlAppMiddleWare = myconf['urlAppMiddleWare'];
const urlWebApiPlantao = myconf['urlWebApiPlantao'];


//Criando o servidor de escuta:
if (urlAppMiddleWare.startsWith("http://")) {
    app.listen(portMiddleWare, () => {
        console.log(`Listening at  ${urlAppMiddleWare} (${portMiddleWare})`);
    });
}
else {
    https.createServer(optsHttps, app).listen(portMiddleWare);
}

/*
Tenho que fazer uma versão adaptada da webapi valida token, para direcionar o login do loginSmart.js para
a web api do plantao. 

*/

app.post('/validaToken', jsonParser, function (req, res) {

    var myJson = req.body; //Token passado via post!
    var token = myJson['token'];    
    var theURL = (urlWebApiPlantao+ '/login');    
    

    //console.log(`token sessão:${req.session.etokenBackEnd}`);
    //req.session.etokenBackEnd="Gravei sessão...";
    var publicKey = fs.readFileSync(server_cert);
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        var myObject = decoded;

        //Agora tenho que checar a senha e o email
        var email = myObject['Email'];
        var password = myObject['password'];
        var semSmartCard = myObject['semSmartCard'];

        if (semSmartCard) {
            var myJson = { 'usuario': email, 'senha':password }; 
            //Chamar login do plantão
            axios({
                method: 'post',
                url: theURL,
                data: myJson,
                httpsAgent: agentAxios,
            }).then((response) => {            
                let etokenBackEnd = response.data['etoken']; 
                //req.session.etokenBackEnd = etokenBackEnd;                 
                //console.log(`etokenBackEnd:${etokenBackEnd}`)     
                res.status(201).json({'Mensagem':'Autenticado!', 'etoken':etokenBackEnd});
            }).catch((error) => {
                res.status(500).json({'Mensagem':'Falhou!'});                
            });            
        }
        else { //Com smartcard
            var theCPF = myObject['CPF'];
            var myJson = { 'usuario': email, 'senha':`SMARTCARDCPF##@##${theCPF}`}; 
            axios({
                method: 'post',
                url: theURL,
                data: myJson
            }).then((response) => {                    
                res.status(201).json(response);
            }).catch((error) => {
                res.status(500).json('Não!');                
            });    

        }

    });

});
