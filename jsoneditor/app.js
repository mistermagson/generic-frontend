const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const jsonPath = './json/';
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



app.get('/:myJson/api/getInterface', jsonParser, function (req, res) {
    var myJson = req.params.myJson;
     


    var token = req.headers['x-access-token'];
    console.log(token);
    //Pegar o usuario
    var publicKey = fs.readFileSync(server_cert);
    jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
        if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        
        //Pegar o dicionário

        let myJsonString = fs.readFileSync(jsonPath + myJson+".json",{'encoding':'utf-8','flag':'r'});   
        let myJsonObject = JSON.parse(myJsonString);    

        //Depois tenho que devolver a interface       
        res.status(200).json(myJsonObject);
        
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











