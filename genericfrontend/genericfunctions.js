//Bibliotecas
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pki = require('node-forge').pki;
const tempfile = require('tempfile');
const spawn = require('child_process').spawn;


//Funções que serão exportadas.

    const derToPem = (der) => {
        var forge = require("node-forge");
        var derKey = forge.util.decode64(der);
        var asnObj = forge.asn1.fromDer(derKey);
        var asn1Cert = forge.pki.certificateFromAsn1(asnObj);
        return forge.pki.certificateToPem(asn1Cert);
    }

    const runCommandOpenSSl = (params,openSSLPATH)=> {
        const stdout = [];
        const stderr = [];
    
        //console.log("Comando:\n" + openSSLPATH + " " + params);
        if (typeof params === 'string') params = params.split(' ');
    
        return new Promise((resolve, reject) => {
            //console.log(process.env.PATH);
            var proc = spawn(openSSLPATH, params);
            proc.stdout.on('data', (data) => {
               // console.log(data);
                //const buf = new Buffer(data, 'hex');
                //console.log(buf.toString('utf8'));
                stdout.push(data);
            });
            proc.stderr.on('data', (data) => {
                //console.log(data);
                const buf = new Buffer(data, 'hex');
                let myAsn = buf.toString('utf8');
                //console.log(myAsn);
                stderr.push(data);
            });
            proc.on('error', (error) => {
                //console.log(error);
                reject(new Error(error | stderr));
            });
            proc.on('exit', (code) => {
                if (code !== 0) {
                    //console.log("Erro!");
                    reject(new Error(stderr.join('\n')));
                } else {
                    resolve(stdout.join('\n'));
                }
            });
        });
    }


    const certDetails = async function (MyCert,openSSLPATH){

        var mytempFile = tempfile('.cert');
        var mytempFileOut = tempfile('.cert');


        fs.writeFileSync(mytempFile, MyCert.raw, function (err) {
            if (err)
                return console.log(err);
        });



        try {


            await runCommandOpenSSl('x509 -inform der -in ' + mytempFile + ' -out ' + mytempFileOut,openSSLPATH); //transforma��o em pem...
            await runCommandOpenSSl('asn1parse -in ' + mytempFileOut + ' -strparse 903',openSSLPATH);

            var certPem = fs.readFileSync(mytempFileOut);
            const certPki = pki.certificateFromPem(certPem);
            const subject = certPki.subject.attributes
                .map(attr => [attr.shortName, attr.value].join('='))
                .join(', ');

            var myField = "";
            var email = "";

            for (let i = 0; i < certPki.extensions.length; i++) {
                if (certPki.extensions[i].name == "subjectAltName") {
                    //id=2.5.29.17
                    email = certPki.extensions[i].altNames[0].value;
                    myField = certPki.extensions[i].altNames[2].value[1].value[0].value;
                    break;
                }
            }

            //console.log(certPki.asn1);
            //console.log("Tenho que decifrar:" + myField);
            /*
             *
             
             2.16.76.1.3.1 = Dados do Titular
             2.16.76.1.3.6 = CEI (INSS)
             2.16.76.1.3.5 = Título de Eleitor
    
            "260119787907222419100000000000000000000000000"
    
            i� OID = 2.16.76.1.3.1 e conte�do = nas primeiras 8 (oito) posições, a data de
            nascimento do titular, no formato ddmmaaaa; nas 11 (onze) posi��es
            subsequentes, o Cadastro de Pessoa F�sica (CPF) do titular; nas 11 (onze)
            posi��es subsequentes, o N�mero de Identifica��o Social � NIS (PIS,PASEP ou
            CI); nas 15 (quinze) posi��es subsequentes, o n�mero do Registro Geral (RG)
            do titular; nas 10 (dez) posi��es subsequentes, as siglas do �rg�o expedidor do
            RG e respectiva unidade da federa��o;
    
            8 primeiras posi��es -> Data de nascimento
            11 seguintes --> CPF do Titular
             */
            var myDataNasc = myField.toString().substring(0, 8);
            var myCPF = myField.toString().substring(8, 19);

            //console.log("Data de Nascimento:" + myDataNasc);
            //console.log("myCPF:" + myCPF);
            var myArray = {};
            myArray["DataNasc"] = myDataNasc;
            myArray["CPF"] = myCPF;
            myArray["Email"] = email;

            //Apagando os arquivos!
            fs.unlinkSync(mytempFile);
            fs.unlinkSync(mytempFileOut);

            return myArray;

        } catch (err) {
            // handle error
            // ...
            fs.unlinkSync(mytempFile);
            fs.unlinkSync(mytempFileOut);

            return null;
        }

    }

  
    const geraToken = (myCertUser, privateKey)=>{
        //var privateKey = fs.readFileSync(server_key);
        //var publicKey = fs.readFileSync(server_cert);
        var token = jwt.sign(myCertUser, privateKey, { algorithm: 'RS256' , expiresIn: 60*60});
        //console.log("UserToken:" + token);
        return token;   
    }

    const decodeToken =(token)=> {
        //var privateKey = fs.readFileSync(server_key);
        var publicKey = fs.readFileSync(server_cert);
    
        var decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        //console.log("UserTokenDecoded:" + JSON.stringify(decoded));
    
        return decoded;   
    
    }

    const podeUrl = (theUrl,validUrls)=>{
        var verifica = false;       
        
    
        for (let i = 0; i < validUrls.length; i++) {
            if (validUrls[i]!="/" && theUrl.indexOf(validUrls[i]) != -1) {
                verifica = true;
                break;
            }
            else if(validUrls[i]=="/" && theUrl == validUrls[i]){
                verifica = true;
                break;
            }
        }
        return verifica;
    }

    const verifyJWT=(req, res, next,validUrls,publicKey)=>{
        var theUrl = req.originalUrl;
        var verifica = true;
        
        
        
        if(podeUrl(theUrl,validUrls)){
            verifica = false;
        }
    
    
    
        if (verifica) {
            var token = req.headers['x-access-token'];
            if (!token) {                
                if (req.session.myToken) {
                    token = req.session.myToken;
                }
                else {                    
                    return res.status(401).redirect('/NaoLogado.html');
                }
            }
            else {
                req.session.myToken = token;
            }    
            
            jwt.verify(token, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
                if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });            
    
                req.session.myToKen = decoded;
                
                next();
            });
        }
        else {
            next();
        }
     
    } 

module.exports={
    derToPem,certDetails,runCommandOpenSSl,geraToken,podeUrl,verifyJWT
}
