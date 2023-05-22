const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const session = require('express-session');
//const http = require('http');
const https = require('https');


const app = express();


//------- Cache -------------------
const nocache = require('nocache');
const { isArray } = require('util');
app.use(nocache());
//---------------------------------


//----------------- HTTPS -----------------------
const optsLogin = {
    key: fs.readFileSync('teste_server_key.pem'),
	cert: fs.readFileSync('teste_server_cert.pem')
};
//----------------------------------------------

app.use(cors());
app.use(session({ secret: "Shh, its a secret!" }));

const server_key = 'teste_server_key.pem';
const server_cert = 'teste_server_cert.pem';


var urlencodedParser = bodyParser.urlencoded({ extended: true });

var jsonParser = bodyParser.json({limit: '50mb'});
const port = 3000;

const myDBPath = 'plantao.db';
const db = new sqlite3.Database(myDBPath, err => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Conexão bem-sucedida ao banco de dados 'plantao.db'");
});

//Retorna string representando uma data no formato dd/mm/yyyy a partir de um objeto Date
function getBrazilianDate(auxData) {

	//Qual a data de hoje?	
	let day = auxData.getUTCDate();
	let month = auxData.getMonth() + 1;
	let year = auxData.getFullYear();

	let sday = (day < 10) ? ('0' + day.toString()) : day.toString();
	let smonth = (month < 10) ? ('0' + month.toString()) : month.toString();

	let theDate = sday + '/' + smonth + '/' + year.toString();

	return theDate;

}

//Uma data no formato dd/mm/yyyy será transformada em Date()
function getDateFromBrazilianDate(auxData) {
	let sday = auxData.substring(0, 2);
	let smonth = auxData.substring(3, 5);
	let syear = auxData.substring(6, 10);

	let theDate = new Date();
	theDate.setFullYear(parseInt(syear));
	theDate.setMonth(parseInt(smonth) - 1);
	theDate.setUTCDate(parseInt(sday));

	return theDate;

}

function geraToken(myData) {
    var privateKey = fs.readFileSync(server_key);
    var token = jwt.sign(myData, privateKey, { algorithm: 'RS256', expiresIn: 60 * 60 });
    return token;
}

function verifyJWT(req, res, next) {
	var theUrl = req.originalUrl;
	console.log(theUrl);

	if (theUrl == '/login') {
		next();
	}
	else {
		var theToken = req.headers['x-access-token'];
		if (!theToken) {
			console.log('token não enviado!');
			return res.status(401).redirect('/naologado');

		}

		var publicKey = fs.readFileSync(server_cert);
		jwt.verify(theToken, publicKey, { algorithms: ['RS256'] }, function (err, decoded) {
			if (err) {
				return res.status(401).redirect('/naologado');
			}

			req.session.myToKen = decoded;
			next();
		});
	}
}

app.use(verifyJWT);

app.get('/naologado', function (req, res) {
	let auxMessage = { 'message': 'NaoLogado' };
	res.status(200).json(auxMessage);
});

//Para testar com curl:
//curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET https://localhost:3000/
app.get('/', function (req, res) {
	let auxMessage = { 'message': 'HelloWord' };
	res.status(200).json(auxMessage);
});


// Para testar via curl dê o comando:
//curl -H "Content-Type: application/json" -X POST -d "{\"usuario\":\"teste\", \"senha\":\"teste\"}" http://localhost:3000/login
//https autoassinado
//curl -k -H "Content-Type: application/json" -X POST -d "{\"usuario\":\"teste\", \"senha\":\"teste123\"}" https://localhost:3000/login
app.post('/login', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var theUser = thebody.usuario;
	var theSenha = thebody.senha;
	//console.log("theUser:", theUser);
	//console.log("req.body", req.body);
	//console.log("req", req);

	let auxsql = `SELECT COUNT(*) as theCount FROM usuario where email=? and senha=?`;
	//console.log("auxsql",auxsql)


	db.all(auxsql, [theUser, theSenha], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			//throw err;
		}
		else {
			rows.forEach((row) => {
				auxCount = row.theCount;
			});
			if (auxCount == "1") {
				let myToken = geraToken({ 'user': theUser });
				res.status(200).json({ 'mensagem': 'Validado', 'etoken': myToken });

			}
			else {
				res.status(500).json({ 'mensagem': 'Login ou senha não coincidem!' });
			}
        }
	});
});

/*

Serviço: Cadastro de Usuários
Operação: Incluir usuário
Método: POST
Interface: /user
Entrada: Um json com usuário, e-mail e senha
Headers: e-token no header: "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!” } ou {“mensagem”:”Ocorreu um erro...” }
Exemplo curl: cd ..
				onde %etoken% é o token jwt enviado após login ... no método post /login
Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master.
				O login do usuário que acionou o serviço já é fornecido no e - token.Se um usuário sem o perfil master tentar 
				utilizar a operação, uma mensagem de erro ocorrerá.Se tudo der certo na inclusão do usuário, uma mensagem de sucesso será enviada.
*/

app.post('/user', jsonParser, function (req, res) {
	var thebody = req.body;
	var theNome = thebody.nome;
	var theEmail = thebody.email;	
	var theSenha = thebody.senha;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	
	const auxfunc = async () =>{
		let isMaster = parseInt(await simpleResultSQL(`select count(*) as theCount from usuario U,`+
							` perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and `+
							` P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`,
							[theUser],'theCount'))> 0 ? true:false;
		let usuarioExiste = parseInt(await 
									simpleResultSQL(`select count(*) as theCount from usuario U where U.email=?`,									
									[theEmail],'theCount') 				
								)>0 ? true:false;
		if(isMaster ==false){
			res.status(500).json({ 'mensagem': `O usuário atual não pode incluir usuários!` });
		}
		else if(usuarioExiste == true){
			res.status(500).json({ 'mensagem': `O usuário ${theEmail} já existe!` });
		}
		else{
			let theResult = await simpleExecSQL(`insert into usuario(nome, email, senha) values(?,?,?)`,
												[theNome, theEmail, theSenha]);
			if(theResult == true){
				res.status(200).json({ 'mensagem': `O usuário ${theEmail} foi incluído com sucesso` });
			}
			else{
				res.status(500).json({ 'mensagem': `Não foi possível incluir o usuário!` });
			}								
		}
	}

	try{
		auxfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': 'Ocorreu um erro desconhecido!' });
	}
});

/*
 
Operação: Excluir usuário
Entidades: Usuário
Método: DELETE
Interface: /user
Entrada: Um json com o e-mail do usuário.
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: 

	curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"email\":\"djsouza@trf3.jus.br\"}" https://localhost:3000/user

Funcionamento: 

	Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já 
	é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão do usuário, 
	uma mensagem de sucesso será enviada.

 */

app.delete('/user', jsonParser, function (req, res) {
	var thebody = req.body;
	var theEmail = thebody.email;

	//Verificar se o usuário que acionou o serviço pode fazer a exclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}
		rows.forEach((row) => {
			auxCount = row.theCount;
		});
		if (auxCount == "1") {
			//O usuário pode fazer a operação. Agora temos que excluir o usuario da tabela de usuários, se o mesmo existir!
			let passou = 1;
			let mensagemErro = 'nada!';

			//Vamos verificar se o usuário existe
			let sqlTest = `select count(*) as theCount from usuario U where U.email=?`;
			db.all(sqlTest, [theEmail], (err2, rowsTest) => {
				if (err2) { passou = 0; }
				else {
					rowsTest.forEach((row) => {
						let auxTest = row.theCount;
						if (auxTest == 0) {
							passou = 0;
							mensagemErro = `Não existe um usuário ${theEmail}`
						}
					});
				}
				if (passou == 1) {
					//Vamos excluir o usuário!
					let auxsql2 = `delete from usuario where email=?`;
					const params = [theEmail];

					db.run(auxsql2, params, err3 => {
						if (err3) {
							res.status(500).json({ 'mensagem': 'Ocorreu um erro na exclusão do usuario!' });
							//throw err;
						}
						else {
							res.status(200).json({ 'mensagem': `O usuário ${theEmail} foi excluído com sucesso` });
						}
					});
				}
				else {
					res.status(200).json({ 'mensagem': mensagemErro });
				}
			});
		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});

/*
 
Operação: Alterar usuário
Entidades: Usuário
Método: PUT
Interface: /user
Entrada: Um json com o e-mail do usuário, nome do usuário, senha.
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}
Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT -d "{\"nome\":\"Daniel Joaquim de Sousa\", \"email\":\"djsouza@trf3.jus.br\", \”senha\”:\”teste123\”}" https://localhost:3000/user

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na alteração do usuário, uma mensagem de sucesso será enviada.

Obs: O e-mail do usuário nunca poderá ser alterado através deste serviço. Uma alternativa é excluir o usuário e incluí-lo novamente

 
 */

app.put('/user', jsonParser, function (req, res) {
	var thebody = req.body;
	var theNome = thebody.nome;
	var theEmail = thebody.email;
	var theSenha = thebody.senha;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}
		rows.forEach((row) => {
			auxCount = row.theCount;
		});
		if (auxCount == "1") {
			//O usuário pode fazer a operação. Agora temos que incluir o usuario na tabela de usuários, se o mesmo não existir!
			let passou = 1;
			let mensagemErro = 'nada!';
			//Vamos verificar se o usuário que se pretende criar já existe
			let sqlTest = `select count(*) as theCount from usuario U where U.email=?`;
			db.all(sqlTest, [theEmail], (err2, rowsTest) => {
				if (err2) { passou = 0; }
				else {
					rowsTest.forEach((row) => {
						let auxTest = row.theCount;
						if (auxTest == 0) {
							passou = 0;
							mensagemErro = `O usuário ${theEmail} não existe!`
						}
					});
				}
				if (passou == 1) {
					//Vamos alterar o usuário!
					let auxsql2 = `update usuario set nome=?,senha=? where email=?`;
					const params = [theNome, theSenha, theEmail];

					db.run(auxsql2, params, err3 => {
						if (err3) {
							res.status(500).json({ 'mensagem': 'Ocorreu um erro na alteração do usuario!' });
							//throw err;
						}
						else {
							res.status(200).json({ 'mensagem': `O usuário ${theEmail} foi alterado com sucesso` });
						}
					});
				}
				else {
					res.status(200).json({ 'mensagem': mensagemErro });
				}
			});
		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});

/*

Operação: Listar usuários
Entidades: Usuário
Método: GET
Interface: /users
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenacao. Exemplos: 

{"inicio":"1", "fim":"10", ”ORDEM”:”ASC”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ”ORDEM”:”DESC”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ”ORDEM”:”ASC”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Saída: Um json com a listagem json com os dados dos usuários, exceto a senha, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.
{
	“usuarios”:[
		{“nome”:”Daniel Joaquim de Sousa”, “email”:”djsouza@trf3.jus.br”},
		{“nome”:”Maria Joaquina”, “email”:”maria@trf3.jus.br”}
		....
	]
}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"10\", \”ORDEM\”:\”ASC\”, \”campo\”:\”código\”}" https://localhost:3000/users

Funcionamento: Tal método somente pode ser utilizado por todos, isto é, usuários com ou sem perfil master. 


 */

app.get('/users', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	if(campo ===undefined  || campo == null){
		campo = 'codigo';
	}
	if(inicio === undefined || inicio == null){
		inicio = 1;
	}
	if(fim === undefined || fim == null){
		fim = 100000;
	}
	if(ordem == undefined || ordem == null){
		ordem="asc";
	}

	listSQLtoJSON("usuario","usuarios", ["codigo", "nome","email"], campo, inicio, fim, ordem).then
		(
			theResult => {
				//res.status(200).json(JSON.parse(theResult).usuarios);
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/*
Operação: Incluir perfil
Entidades: Perfil
Método: POST
Interface: /perfil
Entrada: Um json com nome e descrição
Headers: e - token no header “x - access - token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!” } ou {“mensagem”:”Ocorreu um erro...” }

Exemplo curl: curl - k - H "Content-Type: application/json" - H "x-access-token:%etoken%" - X POST - d "{\"nome\":\"adm_regional\", \"descricao\":\"perfil para responsáveis pela administração da escala\"}" https://localhost:3000/perfil

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master.O login do usuário que acionou o serviço já é fornecido no e - token.Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá.Se tudo der certo na inclusão do usuário, uma mensagem de sucesso será enviada.

*/

app.post('/perfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theNome = thebody.nome;
	var theDescricao = thebody.descricao;
	


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}
		rows.forEach((row) => {
			auxCount = row.theCount;
		});
		if (auxCount == "1") {
			//O usuário pode fazer a operação. Agora temos que incluir o perfil na tabela de perfis, se o mesmo não existir!
			let passou = 1;
			let mensagemErro = 'nada!';
			//Vamos verificar se o perfil que se pretende criar já existe
			let sqlTest = `select count(*) as theCount from perfil P where P.nome=?`;
			db.all(sqlTest, [theNome], (err2, rowsTest) => {
				if (err2) { passou = 0; }
				else {
					rowsTest.forEach((row) => {
						let auxTest = row.theCount;
						if (auxTest > 0) {
							passou = 0;
							mensagemErro = `Já existe um perfil ${theNome}`
						}
					});
				}
				if (passou == 1) {
					//Vamos incluir o perfil!
					let auxsql2 = `insert into perfil(nome, descricao) values(?,?)`;
					const params = [theNome, theDescricao];

					db.run(auxsql2, params, err3 => {
						if (err3) {
							res.status(500).json({ 'mensagem': 'Ocorreu um erro na inclusão do perfil!' });
							//throw err;
						}
						else {
							res.status(200).json({ 'mensagem': `O perfil ${theNome} foi incluído com sucesso` });
						}
					});
				}
				else {
					res.status(200).json({ 'mensagem': mensagemErro });
				}
			});
		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});

/*
 
Operação: Excluir perfil
Entidades: Perfil
Método: DELETE
Interface: /perfil
Entrada: Um json com o nome do perfil a ser excluído
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"nome\":\"adm_regional\"}" https://localhost:3000/perfil

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na inclusão do usuário, uma mensagem de sucesso será enviada. O perfil master não pode ser excluído!


 */

app.delete('/perfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theNome = thebody.nome;

	//Verificar se o usuário que acionou o serviço pode fazer a exclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}
		rows.forEach((row) => {
			auxCount = row.theCount;
		});
		if (auxCount == "1") {
			//O usuário pode fazer a operação. Agora temos que excluir o perfil da tabela de perfis, se o mesmo existir!
			let passou = 1;
			let mensagemErro = 'nada!';

			//Vamos verificar se o perfil existe
			let sqlTest = `select count(*) as theCount from perfil P where P.nome=?`;
			db.all(sqlTest, [theNome], (err2, rowsTest) => {
				if (err2) { passou = 0; }
				else {
					rowsTest.forEach((row) => {
						let auxTest = row.theCount;
						if (auxTest == 0) {
							passou = 0;
							mensagemErro = `Não existe um perfil ${theNome}`
						}
						else {
							if (theNome == "master") {
								passou = 0;
								mensagemErro = `O perfil master não pode ser excluído!`
                            }
                        }
					});
				}
				if (passou == 1) {
					//Vamos excluir o perfil!
					let auxsql2 = `delete from perfil where nome=?`;
					const params = [theNome];

					db.run(auxsql2, params, err3 => {
						if (err3) {
							res.status(500).json({ 'mensagem': 'Ocorreu um erro na exclusão do perfil!' });
							//throw err;
						}
						else {
							res.status(200).json({ 'mensagem': `O perfil ${theNome} foi excluído com sucesso` });
						}
					});
				}
				else {
					res.status(200).json({ 'mensagem': mensagemErro });
				}
			});
		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});

/*
 
Operação: Alterar perfil
Entidades: Perfil
Método: PUT
Interface: /perfil
Entrada: Um json com nome e descrição
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT -d "{\"nome\":\"adm_regional\", \"descricao\":\"perfil para responsáveis pela administração da escala\"}" https://localhost:3000/perfil

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na inclusão do usuário, uma mensagem de sucesso será enviada.

 
 */
app.put('/perfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theNome = thebody.nome;
	var theDescricao = thebody.descricao;



	//Verificar se o usuário que acionou o serviço pode fazer a alteração, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}
		rows.forEach((row) => {
			auxCount = row.theCount;
		});
		if (auxCount == "1") {
			//O usuário pode fazer a operação. Agora temos que incluir o perfil na tabela de perfis, se o mesmo não existir!
			let passou = 1;
			let mensagemErro = 'nada!';
			//Vamos verificar se o perfil que se pretende criar já existe
			let sqlTest = `select count(*) as theCount from perfil P where P.nome=?`;
			db.all(sqlTest, [theNome], (err2, rowsTest) => {
				if (err2) { passou = 0; }
				else {
					rowsTest.forEach((row) => {
						let auxTest = row.theCount;
						if (auxTest == 0) {
							passou = 0;
							mensagemErro = `Não existe um perfil ${theNome}!`
						}
					});
				}
				if (passou == 1) {
					//Vamos alterar o perfil!
					let auxsql2 = `update perfil set descricao=? where nome=?`;
					const params = [theDescricao,theNome];

					db.run(auxsql2, params, err3 => {
						if (err3) {
							res.status(500).json({ 'mensagem': 'Ocorreu um erro na alteração do perfil!' });
							//throw err;
						}
						else {
							res.status(200).json({ 'mensagem': `O perfil ${theNome} foi alterado com sucesso` });
						}
					});
				}
				else {
					res.status(200).json({ 'mensagem': mensagemErro });
				}
			});
		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});


/*
 
Operação: Listar Perfis
Entidades: Perfil
Método: GET
Interface: /perfis
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenacao. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Saída: Um json com a listagem json com os dados dos perfis, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.
{
	“perfis”:[
		{“nome”:”adm_regional”, “descricao”:” perfil para responsáveis pela administração da escala”},
		{“nome”:”magistrado_campogrande” , “descricao”:” perfil associado aos magistrados de Campo Grande”}
		....
	]
}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"10\", \”ORDEM\”:\”ASC\”, \”campo\”:\”codigo\”}" https://localhost:3000/perfis

Funcionamento: Tal método somente pode ser utilizado por usuário com perfil master.

 */

app.get('/perfis', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	if (((campo == "nome" || campo == "codigo" || campo == "descricao")) && (ordem == "asc" || ordem == "desc")) {

		let auxsql = `SELECT codigo,nome,descricao FROM perfil where ${campo} >= ? and ${campo} <= ? order by ${campo} ${ordem}`;

		console.log("auxsql:", auxsql);

		db.all(auxsql, [inicio, fim], (err, rows) => {
			if (err) {
				//throw err;
				res.status(500).json({ 'mensagem': 'Ocorreu um erro nesta consulta!' });
				//throw err;
			}
			else {
				result = '{"perfis":[';
				first = 0;
				rows.forEach((row) => {
					let codigo = row.codigo;
					let nome = row.nome;
					let descricao = row.descricao;
					if (first == 0) {
						result += `{"codigo":"${codigo}","nome":"${nome}","descricao":"${descricao}"}`
						first = 1;
					}
					else {
						result += `,{"codigo":"${codigo}","nome":"${nome}","descricao":"${descricao}"}`
					}
				});
				result += "]}";
				res.status(200).json(JSON.parse(result));
			}
		});
	}
	else {
		res.status(200).json({ 'mensagem': 'Consulta impossível!Campo de ordenação inconsistente!' });
	}

});



/*
 
 Operação: Atribuir perfil a usuário
 Entidades: Perfil, Usuário
 Método: POST
 Interface: /userPerfil
 Entrada: Um json com email e "nome do perfil". Exemplo: {"email":"djsouza@trf3.jus.br", "perfil":"adm_regional"}
 Headers: e-token no header "x-access-token"
 Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}
 Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"email\":\"djsouza@trf3.jus.br\",\"perfil\":\"adm_regional\"}" https://localhost:3000/userPerfil

 Funcionamento: Após o envio do e-mail do usuário e do nome do perfil (perfil), o método associa o usuário ao perfil indicado.
 
 */
app.post('/userPerfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theEmail = thebody.email;
	var theNomePerfil = thebody.perfil;
	//console.log(`perfil:${theNomePerfil}`);


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		//console.log("linha 812");
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}

		rows.forEach((row) => {
			auxCount = row.theCount;
		});

		if (auxCount == "1") {
			//console.log("linha 826");
			//O usuário pode fazer a operação.
			// Agora vamos associar o perfil ao usuário
			let passou = 1;
			let codigoUser = -1;
			let mensagemErro = 'nada!';

			//Verificar qual é o código do usuário
			let sqlAux1 = `select codigo from usuario where email =?`
			//console.log("linha 835");
			db.get(sqlAux1, [theEmail], (errAux1, row1) => {
				if (errAux1) {
					passou = 0;
					res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ao usuário ${theUser}` });
				}
				else {
					if (row1 === undefined) { passou = 0; }
					else {
						codigoUser = row1.codigo;
						passou = 1;
                    }
				}
				//console.log("linha 848");
				if (passou == 1 && codigoUser != -1) {
					//console.log("linha 850");
					//Agora vou pegar o código do perfil
					passou = 0;
					let sqlAux2 = `select codigo from perfil where nome=?`;
					//console.log("linha 854");
					db.get(sqlAux2, [theNomePerfil], (errAux2, row2) => {						
						if (errAux2) {
							passou = 0;
							res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ao usuário ${theUser}` });
						}
						else {
							if (row2 === undefined) { passou = 0; }
							else {
								codigoPerfil = row2.codigo;
								passou = 1;
                            }
						}
						//console.log("linha 867");
						//Agora vou associar o usuário ao perfil
						if (passou == 1) {
							//console.log("linha 871");
							//Vamos inserir somente se não foi inserido.
							passou = 0 
							let sqlTest = `select count(*) as theCount from usuario_perfil where codigo_usuario=? and codigo_perfil=?`
							db.get(sqlTest, [codigoUser, codigoPerfil], (errTest,rowTest) => {
								if (errTest) {
									//console.log("linha 877");
									res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ao usuário ${theUser}` });
								}
								else {
									if (rowTest === undefined) {	
										//console.log("linha 882");
										res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ao usuário ${theUser}` });
									}
									else {
										//console.log("linha 886");
										let auxCount2 = rowTest.theCount;
										//console.log(`count:${auxCount2}`)
										if (auxCount2 == 0) {
											//Finalmente vamos associar!
											let sqlAux3 = `insert into usuario_perfil(codigo_usuario,codigo_perfil) values(?,?)`;
											db.run(sqlAux3, [codigoUser, codigoPerfil], errAux3 => {
												if (errAux3) {
													res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ao usuário ${theUser}` });
												}
												else {
													res.status(200).json({ 'mensagem': `O perfil ${theNomePerfil} foi liberado com sucesso ao usuário ${theUser}` });
												}
											});
										}
										else {
											res.status(500).json({ 'mensagem': `O perfil ${theNomePerfil} já tinha sido liberado ao usuário ${theUser}` });
                                        }
									}
                                }
							});
						}
						else {
							res.status(500).json({ 'mensagem': `Ocorreu um erro na liberação do perfil ${theNomePerfil} ao usuário ${theUser}` });
                        }

					})

				}
            })

		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});


/*
Operação: Desatribuir perfil a usuário
Entidades: Perfil, Usuário
Método: DELETE
Interface: /userPerfil
Entrada: Um json com email e "nome do perfil". Exemplo: {"email":"djsouza@trf3.jus.br","perfil":"adm_regional"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}
Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"email\":\"djsouza@trf3.jus.br\",\"perfil\":\"adm_regional\"}" https://localhost:3000/userPerfil

Funcionamento: Após o envio do e-mail do usuário e do nome do perfil (perfil), o método desassocia o usuário ao perfil indicado.


 */

app.delete('/userPerfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theEmail = thebody.email;
	var theNomePerfil = thebody.perfil;
	//console.log(`perfil:${theNomePerfil}`);


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		//console.log("linha 812");
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}

		rows.forEach((row) => {
			auxCount = row.theCount;
		});

		if (auxCount == "1") {
			//console.log("linha 826");
			//O usuário pode fazer a operação.
			// Agora vamos desassociar o perfil ao usuário
			let passou = 1;
			let codigoUser = -1;
			let mensagemErro = 'nada!';

			//Verificar qual é o código do usuário
			let sqlAux1 = `select codigo from usuario where email =?`
			//console.log("linha 835");
			db.get(sqlAux1, [theEmail], (errAux1, row1) => {
				if (errAux1) {
					passou = 0;
					res.status(500).json({ 'mensagem': `982:Ocorreu um erro na remoção do perfil ao usuário ${theUser}` });
				}
				else {
					if (row1 === undefined) { passou = 0; }
					else {
						codigoUser = row1.codigo;
						passou = 1;
					}
				}
				//console.log("linha 848");
				if (passou == 1 && codigoUser != -1) {
					//console.log("linha 850");
					//Agora vou pegar o código do perfil
					passou = 0;
					let sqlAux2 = `select codigo from perfil where nome=?`;
					//console.log("linha 854");
					db.get(sqlAux2, [theNomePerfil], (errAux2, row2) => {
						if (errAux2) {
							passou = 0;
							res.status(500).json({ 'mensagem': `1001:Ocorreu um erro na remoção do perfil ao usuário ${theUser}` });
						}
						else {
							if (row2 === undefined) { passou = 0; }
							else {
								codigoPerfil = row2.codigo;
								passou = 1;
							}
						}
						//console.log("linha 867");
						//Agora vou associar o usuário ao perfil
						if (passou == 1) {

							//Finalmente vamos desassociar!
							let sqlAux3 = `delete from usuario_perfil where codigo_usuario=? and codigo_perfil=?`;
							db.run(sqlAux3, [codigoUser, codigoPerfil], errAux3 => {
								if (errAux3) {
									res.status(500).json({ 'mensagem': `1018:Ocorreu um erro na remoção do perfil ao usuário ${theUser}` });
								}
								else {
									res.status(200).json({ 'mensagem': `O perfil ${theNomePerfil} foi removido com sucesso para o usuário ${theUser}` });
								}
							});							
						}
						else {
							res.status(500).json({ 'mensagem': `1026:Ocorreu um erro na remoção do perfil ${theNomePerfil} ao usuário ${theUser}` });
						}

					})

				}
			})

		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});

/*
Operação: Consultar atribuição de perfil a usuário
Entidades: Perfil, Usuário
Método: GET
Interface: /userPerfil
Entrada: Um json com email e "nome do perfil". Exemplo: {"email":"djsouza@trf3.jus.br","perfil":"adm_regional"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"estado":"existente"} ou {"estado":"inexistente"}
Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"email\":\"djsouza@trf3.jus.br\",\"perfil\":\"adm_regional\"}" https://localhost:3000/userPerfil

Funcionamento: Após o envio do e-mail do usuário e do nome do perfil (perfil), o método informa o perfil informado está atribuído ao usuário.
 */

app.get('/userPerfil', jsonParser, function (req, res) {
	var thebody = req.body;
	var theEmail = thebody.email;
	var theNomePerfil = thebody.perfil;
	//console.log(`perfil:${theNomePerfil}`);


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	db.all(auxsql, [theUser], (err, rows) => {
		//console.log("linha 812");
		let auxArray = [];
		let auxCount = 0;
		if (err) {
			//throw err;
			res.status(500).json({ 'mensagem': 'Ocorreu um erro na validação!' });
			throw err;
		}

		rows.forEach((row) => {
			auxCount = row.theCount;
		});

		if (auxCount == "1") {
			//console.log("linha 826");
			//O usuário pode fazer a operação.
			// Agora vamos desassociar o perfil ao usuário
			let passou = 1;
			let codigoUser = -1;
			let mensagemErro = 'nada!';

			//Verificar qual é o código do usuário
			let sqlAux1 = `select codigo from usuario where email =?`
			//console.log("linha 835");
			db.get(sqlAux1, [theEmail], (errAux1, row1) => {
				if (errAux1) {
					passou = 0;
					res.status(500).json({ 'mensagem': `1096:Ocorreu um erro na consulta de atribuição do perfil ao usuário ${theUser}` });
				}
				else {
					if (row1 === undefined) { passou = 0; }
					else {
						codigoUser = row1.codigo;
						passou = 1;
					}
				}
				//console.log("linha 848");
				if (passou == 1 && codigoUser != -1) {
					//console.log("linha 850");
					//Agora vou pegar o código do perfil
					passou = 0;
					let sqlAux2 = `select codigo from perfil where nome=?`;
					//console.log("linha 854");
					db.get(sqlAux2, [theNomePerfil], (errAux2, row2) => {
						if (errAux2) {
							passou = 0;
							res.status(500).json({ 'mensagem': `1115:Ocorreu um erro na consulta de atribuição do perfil ao usuário ${theUser}` });
						}
						else {
							if (row2 === undefined) { passou = 0; }
							else {
								codigoPerfil = row2.codigo;
								passou = 1;
							}
						}
						//console.log("linha 867");
						//Agora vou associar o usuário ao perfil
						if (passou == 1) {

							//Finalmente vamos consultar!
							let sqlAux3 = `select count(*) as theCount from usuario_perfil where codigo_usuario=? and codigo_perfil=?`;
							db.get(sqlAux3, [codigoUser, codigoPerfil], (errAux3,row3) => {
								if (errAux3) {
									res.status(500).json({ 'mensagem': `1132:Ocorreu um erro na consulta de atribuição do perfil ao usuário ${theUser}` });
								}
								else {
									let theCount = row3.theCount;
									if (theCount > 0) {
										res.status(200).json({ 'estado': 'existente' });
									}
									else {
										res.status(200).json({ 'estado': 'inexistente' });
                                    }
									
								}
							});
						}
						else {
							res.status(500).json({ 'mensagem': `1147:Ocorreu um erro na consulta de atribuição do perfil ao usuário ${theUser}` });
						}

					})

				}
			})

		}
		else {
			res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
		}
	});
});



function isUserMaster(theUserEmail) {

	let auxsql = `select count(*) as theCount from usuario U, perfil P, usuario_perfil UP where U.codigo = UP.codigo_usuario and P.codigo = UP.codigo_perfil and P.nome="master"  and U.email=?`;

	let auxPromise = new Promise(function (resolve, reject) {
		db.get(auxsql, [theUserEmail], (err, row) => {
			let auxArray = [];
			let auxCount = 0;
			if (err) {
				//console.log("1172:Ocorreu um erro na consulta ao BD!")
				reject (err)
			}

			auxCount = row.theCount;
//			console.log(`auxCount em isUserMaster:${auxCount}`)

			if (auxCount == "1") {
				resolve(true)
			}
			else {
				resolve(false)
			}
		});
	});
	return auxPromise;
	/*theResult = false;
	auxPromise.then(
		function (value) {
			console.log(`Entrei em auxPromise.then!value:${value}`)
			theResult = value;
		},
		function (error) {
			theResult = false;
        }
	);

	console.log(`Sai de auxPromise.then! theResult:${theResult}`)
	return theResult;*/
	
}

function multipleResultSQL(auxsql, params, fields) {

	let auxPromise = new Promise(function (resolve, reject) {
		db.get(auxsql, params, (err, row) => {
			let auxArray = [];
			let auxCount = 0;
			if (err) {
				console.log("1172:Ocorreu um erro na consulta ao BD!")
				reject(err);
			}

			if (row === undefined) {
				resolve(undefined)
			}
			else {
				//fields é um array de nomes de campo
				auxArray = []
				fields.forEach((field) => {
					auxArray.push(row[field])
				});
				//vamos devolver o array de resultados
				resolve(auxArray)				
			}
		});
	});

	return auxPromise;

}


function simpleResultSQL(auxsql, params, field) {

	let auxPromise = new Promise(function (resolve, reject) {
		db.get(auxsql, params, (err, row) => {
			let auxArray = [];
			let auxCount = 0;
			if (err) {
				console.log("1172:Ocorreu um erro na consulta ao BD!")
				reject(err);
			}
			
			if (row === undefined) {
				resolve(undefined)
			}
			else {
				resolve(row[field])
			}
		});
	});

	return auxPromise;

}

function filtroToSQLWhere(filtro){
	try{
		let auxArray = filtro.split(";");
		let conectivo = auxArray[0];		
		let expSQL = ""
		if(conectivo == 'or'){
			let auxValue = auxArray[1];
			for(let i=2;i<auxArray.length;i++){			
				let auxField = auxArray[i];
				if(i>2){
					expSQL += ` ${conectivo}  `;
				}
				expSQL += ` ${auxField} like '%${auxValue}%'`;
			}
		}
		else if(conectivo == 'eq'){
			let auxField = auxArray[1];
			let auxValue = auxArray[2];
			auxValue = replaceCalcObjectID(auxValue);			
			expSQL = ` ${auxField} = '${auxValue}' `;
		}


		return expSQL
	
	}
	catch(err){
		return '';
	}

}

function multipleResultSQLtoStringArrays(auxsql, params, fields) {
	let auxPromise = new Promise(function (resolve, reject) {

		db.all(auxsql,params, (err, rows) => {
			let masterArray = [];
			let auxCount = 0;
			if (err) {
				reject("Ocorreu um erro no BD");
			}
			else {
				
				rows.forEach((row) => {
					let auxArray = [];
					fields.forEach((field)=>{
						auxArray.push(row[field])
					})
					masterArray.push(auxArray);
				});		
				resolve(masterArray)
			}
		});
	});

	return auxPromise;
}


function simpleResultSQLtoStringArray(auxsql, params, field) {
	let auxPromise = new Promise(function (resolve, reject) {

		db.all(auxsql,params, (err, rows) => {
			let auxArray = [];
			let auxCount = 0;
			if (err) {
				reject("Ocorreu um erro no BD");
			}
			else {
				auxArray = []
				rows.forEach((row) => {
					auxArray.push(row[field])
				});		
				resolve(auxArray)
			}
		});
	});

	return auxPromise;
}


function simpleExecSQL(auxsql, params) {

	let auxPromise = new Promise(function (resolve, reject) {		
		db.run(auxsql, params, err => {
			if (err) {
				resolve(false)
			}
			else {
				resolve(true)
			}
		});
	});

	return auxPromise;
}

function db_run_async(sql, arrayParam) {
	return new Promise((resolve, reject) => {
		db.run(sql, arrayParam, (err) => {
			if (err) {
				resolve(false);
			}
			else {
				resolve(true);
			}			
		})	
	});
}

function multipleExecSQLWithTransaction(arraySqls, arrayParams) {

	let auxPromise = new Promise((resolve, reject) => {

		var results = [];



		const myfunc = async () => {
			db.exec("BEGIN");
			let passou = true;
			for (i = 0; i < arraySqls.length; i++) {
				theSql = arraySqls[i];
				auxResult = await db_run_async(theSql, arrayParams[i]);
				if (auxResult == false) {
					passou = false;
					break;
				}
			}
			if (passou == false) {
				db.exec("ROLLBACK");
				return false;
			}
			else {
				db.exec("COMMIT");
				return true;
			}
		}

		try {
			let aux = myfunc();
			resolve(aux);
		}
		catch (errT) {
			resolve(false);
		}

	});		

	return auxPromise;
}






/*
 
Operação: Incluir Funcionalidade
Entidades: Funcionalidade
Método: POST
Interface: /funcionalidade
Entrada: Um json o nome da funcionalidade. Exemplo: {"funcionalidade":"incluir escala de plantão"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"funcionalidade\":\"teste de funcionalidade\"}" https://localhost:3000/funcionalidade

Funcionamento: Inclusão de uma funcionalidade com (código e nome). O nome é fornecido pelo usuário e o código é gerado automaticamente pelo backend. A inclusão de uma funcionalidade não gera efeito nenhum no sistema. O programador é quem deve implementar a funcionalidade dando um nome à mesma. Este é um dado crítico do sistema. São informações que devem ser inseridas com a devida cautela. As funcionalidades servem para customizar a interface conforme os perfis de acesso do usuário. É papel do frontend utilizar o recurso de forma adequada, fazendo os devidos mapeamentos das rotinas disponíveis para as funcionalidades de frontend.


 */
app.post('/funcionalidade', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theFuncionalidade = thebody.funcionalidade;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a funcionalidade, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from funcionalidade where nome=?`, [theFuncionalidade], "theCount").then
					(						
						theCount => {							
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (theCount > 0) {
								res.status(200).json({ 'mensagem': 'A funcionalidade já foi incluída no sistema!' });
							}
							else {
								//Agora vamos incluir!
								console.log(`theFuncionalidade:${theFuncionalidade}`);
								simpleExecSQL(`insert into funcionalidade(nome) values (?)`, [theFuncionalidade]).then
									(
										theresult => {
											//console.log(`1316:theresult:${theresult}`)
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `A funcionalidade ${theFuncionalidade} foi incluída com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});



/*

Operação: Excluir Funcionalidade
Entidades: Funcionalidade
Método: POST
Interface: /funcionalidade
Entrada: Um json o nome da funcionalidade. Exemplo: {"funcionalidade":"incluir escala de plantão"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"funcionalidade\":\"teste de funcionalidade\"}" https://localhost:3000/funcionalidade

Funcionamento: Exclusão de uma funcionalidade com (código e nome). O nome é fornecido pelo usuário e o código é gerado automaticamente pelo backend. (Vide anterior)


 */
app.delete('/funcionalidade', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theFuncionalidade = thebody.funcionalidade;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos excluir a funcionalidade
				simpleExecSQL(`delete from funcionalidade where nome=?`, [theFuncionalidade]).then
				(
					theresult => {
						//console.log(`1316:theresult:${theresult}`)
						if (theresult == true) {
							res.status(200).json({ 'mensagem': `A funcionalidade ${theFuncionalidade} foi excluída com sucesso!` });
						}
					},
					err3 => {
						res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
					}
				);
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});



/*
 
Operação: Atribuição de funcionalidade a um perfil
Entidades: Funcionalidade, Perfil
Método: POST
Interface: /funcionalidade
Entrada: Um json o nome da funcionalidade e nome do perfil. Exemplo: {"funcionalidade":"incluir escala de plantão", “perfil”: “adm_regional”}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d  "{\"funcionalidade\":\"teste funcionalidade 1\", \"perfil\":\"adm_regional\"}" https://localhost:3000/funcionalidadePerfil

Funcionamento: Após envio do nome da funcionalidade e do nome do perfil, o método associa a funcionalidade ao perfil.

 
 */

app.post('/funcionalidadePerfil', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theFuncionalidade = thebody.funcionalidade;
	var thePerfil = thebody.perfil;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Vamos verificar se existe a funcionalidade e o perfil
				simpleResultSQL(`SELECT count(*) as theCount from funcionalidade f, perfil p where p.nome =? and f.nome =?`,
								[thePerfil, theFuncionalidade], "theCount").then
				(
					auxCount => {
						//console.log(`auxCount:${auxCount}`)
						if (auxCount === undefined) {
							res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
						}
						else if (auxCount > 0) { // então existe ... Vamos incluir...
							//Agora vamos associar, se a associação não existe.
							simpleResultSQL(`select count(*) as theCount from perfil_funcionalidade pf, funcionalidade f, perfil p where pf.codigo_perfil = p.codigo and f.codigo = pf.codigo_funcionalidade `
								+ ` and p.nome=? and f.nome=?`, [thePerfil, theFuncionalidade], "theCount").then
								(
									theCount => {
										if (theCount === undefined) {
											res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
										}
										else if (theCount > 0) {
											res.status(200).json({ 'mensagem': 'A associação perfilxfuncionalidade já tinha sido incluída no sistema!' });
										}
										else {
											//Agora vamos incluir!
											//console.log(`theFuncionalidade:${theFuncionalidade}`);
											simpleExecSQL(` insert into perfil_funcionalidade(codigo_perfil,codigo_funcionalidade) SELECT p.codigo as codigo_perfil,` +
												` f.codigo as codigo_funcionalidade from funcionalidade f,perfil p ` +
												`where f.nome=? and p.nome=?`, [theFuncionalidade, thePerfil]).then
												(
													theresult => {
														//console.log(`1316:theresult:${theresult}`)
														if (theresult == true) {
															res.status(200).json({ 'mensagem': `Foi realizada a associação da funcionalidade ${theFuncionalidade} com o perfil ${thePerfil}!` });
														}
													},
													err3 => {
														res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
													}
												);
										}
									},
									err2 => {
										res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
									}
								)
						}
						else {
							res.status(200).json({ 'mensagem': 'Não existe este perfil ou funcionalidade!' });
                        }
					},
					err1 => {
						res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
                    }
                )


			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});

/*
Operação: Desatribuição de funcionalidade a um perfil
Entidades: Funcionalidade, Perfil
Método: DELETE
Interface: /funcionalidade
Entrada: Um json o nome da funcionalidade e nome do perfil. Exemplo: {"funcionalidade":"incluir escala de plantão", “perfil”: “adm_regional”}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 
curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d  {\"funcionalidade\":\"incluir escala de plantão\", \“perfil\”:\“adm_regional\”} https://localhost:3000/funcionalidadePerfil

Funcionamento: Após envio do nome da funcionalidade e do nome do perfil, o método desassocia a funcionalidade ao perfil.

*/

app.delete('/funcionalidadePerfil', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theFuncionalidade = thebody.funcionalidade;
	var thePerfil = thebody.perfil;

	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//Vamos verificar se existe a funcionalidade e o perfil
				simpleResultSQL(`SELECT count(*) as theCount from funcionalidade f, perfil p where p.nome =? and f.nome =?`,
					[thePerfil, theFuncionalidade], "theCount").then
					(
						auxCount => {
							if (auxCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (auxCount > 0) {
								// então existe ... Vamos excluir!
								simpleExecSQL(` delete from perfil_funcionalidade where codigo_perfil in (` +
									`SELECT p.codigo as codigo_perfil from perfil p where p.nome=?)` +
									`and codigo_funcionalidade in (select f.codigo from funcionalidade f where f.nome=?)`, [thePerfil, theFuncionalidade]).then
									(
										theresult => {											
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `Foi excluída a associação da funcionalidade ${theFuncionalidade} com o perfil ${thePerfil}!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);								
							}
							else {
								res.status(200).json({ 'mensagem': 'Não existe este perfil ou funcionalidade!' });
							}
						},
						err1 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)


			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});


/*

Operação: Incluir Regional
Entidades: Regional
Método: POST
Interface: /regional
Entrada: Um json com nome da regional
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"regional\":\"regional de campo grande\"}" https://localhost:3000/regional

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na inclusão da regional, uma mensagem de sucesso será enviada.

 */
app.post('/regional', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theRegional = thebody.regional;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a regional, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from regional where nome=?`, [theRegional], "theCount").then
					(
						theCount => {
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (theCount > 0) {
								res.status(200).json({ 'mensagem': 'A regional já tinha sido incluída no sistema!' });
							}
							else {
								//Agora vamos incluir!								
								simpleExecSQL(`insert into regional(nome) values (?)`, [theRegional]).then
									(
										theresult => {											
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `A regional "${theRegional}" foi incluída com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});

/*

Operação: Excluir Regional
Entidades: Regional
Método: DELETE
Interface: /regional
Entrada: Um json com nome da regional
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"regional\":\"regional de campo grande\"}" https://localhost:3000/regional

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. 
Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão da regional, uma mensagem de sucesso será enviada.

*/
app.delete('/regional', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theRegional = thebody.regional;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a regional, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from regional where nome=?`, [theRegional], "theCount").then
					(
						theCount => {
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (theCount == 0) {
								res.status(200).json({ 'mensagem': 'A regional não existe no sistema!' });
							}
							else {
								//Agora vamos incluir!								
								simpleExecSQL(`delete from regional where nome=?`, [theRegional]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `A regional "${theRegional}" foi removida com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});


function listSQLtoJSON(tabela, nomeLista,listaCampos,campo,inicio,fim,ordem ) {

	let auxPromise = new Promise(function (resolve, reject) {

		indexCampo = listaCampos.indexOf(campo);

		if ((indexCampo != -1) && (ordem == "asc" || ordem == "desc")) {

			let auxsql = `SELECT ${listaCampos.toString()} FROM ${tabela} where ${campo} >= ? and ${campo} <= ? order by ${campo} ${ordem}`;

			//console.log("auxsql:", auxsql);

			db.all(auxsql, [inicio, fim], (err, rows) => {
				if (err) {
					reject("Erro de Banco de Dados");
				}
				else {
					result = `{"${nomeLista}":[`;
					first = 0;
					rows.forEach((row) => {
						for (let i = 0; i < listaCampos.length; i++) {
							theField = listaCampos[i];
							if (i > 0) {
								result += ","
							}
							else {
								if (first == 0) {
									result += "{"
									first = 1;
								}
								else {
									result += ",{"
								}
							}
							result += `"${theField}":"${row[theField]}"`
						}
						result += "}";
					});
					result += "]}";
					resolve(result);
				}
			});
		}
		else {
			reject("Ordenação impossível!");
        }
		
	});

	return auxPromise;
}


function listSQLtoJSONFromSQL(theSQL, nomeLista,listaCampos, campo, inicio, fim, ordem, hasWhere) {

	let auxPromise = new Promise(function (resolve, reject) {

		indexCampo = listaCampos.indexOf(campo);

		if ((indexCampo != -1) && ordem == "asc" || ordem == "desc") {

			//let auxsql = `SELECT ${listaCampos.toString()} FROM ${tabela} where ${campo} >= ? and ${campo} <= ? order by ${campo} ${ordem}`;

			theWhere = (hasWhere) ? " and " : " where ";

			let auxsql = theSQL + theWhere + ` ${campo} >= ? and ${campo} <= ? order by ${campo} ${ordem}`;


			//console.log("auxsql:", auxsql);

			db.all(auxsql, [inicio, fim], (err, rows) => {
				if (err) {
					reject("Erro de Banco de Dados");
				}
				else {
					result = `{"${nomeLista}":[`;
					first = 0;
					rows.forEach((row) => {	
						for (let i = 0; i < listaCampos.length; i++) {
							theField = listaCampos[i];
							if (i > 0) {
								result += ","
							}
							else {
								if (first == 0) {
									result += "{"
									first = 1;
								}
								else {
									result += ",{"
								}
							}
							result += `"${theField}":"${row[theField]}"`
						}
						result += "}";
					});
					result += "]}";
					resolve(result);
				}
			});
		}
		else {
			reject("Ordenação impossível!");
		}

	});

	return auxPromise;
}


/*
 Operação: Listar Regionais
Entidades: Regional
Método: GET
Interface: /regionais
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenacao. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"a\", \"fim\":\"z\", \"ordem\":\"asc\",\"campo\":\"nome\"}" https://localhost:3000/regionais

Saída: Um json com a listagem json com os dados das regionais, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.


 */
app.get('/regionais', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSON("regional","regionais",["codigo", "nome"], campo,inicio,fim, ordem).then
	(
		theResult => {
			res.status(200).json(JSON.parse(theResult));
		},
		theError => {
			res.status(500).json({ 'mensagem': theError });
        }
	);
});

/*
 
Operação: Atribuir perfil a regional
Entidades: Perfil, Regional
Método: POST
Interface: /regionalPerfil
Entrada: Um json com o nome da regional e "nome do perfil". Exemplo: {"regional":"regional campo grande","perfil":"adm_regional"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}
Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"regional\":\"regional campo grande\",\"perfil\":\"adm_regional\"}" https://localhost:3000/regionalPerfil

Funcionamento: Após o envio da regional e do perfil (perfil), o método associa a regional ao perfil indicado.


 */

app.post('/regionalPerfil', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theRegional = thebody.regional;
	var thePerfil = thebody.perfil;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Vamos verificar se existe a funcionalidade e o perfil
				simpleResultSQL(`SELECT count(*) as theCount from regional r, perfil p where p.nome =? and r.nome =?`,
					[thePerfil, theRegional], "theCount").then
					(
						auxCount => {
							//console.log(`auxCount:${auxCount}`)
							if (auxCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (auxCount > 0) { // então existe ... Vamos incluir...
								//Agora vamos associar, se a associação não existe.
								simpleResultSQL(`select count(*) as theCount from perfil_regional pr, regional r, perfil p where pr.codigo_perfil = p.codigo and r.codigo = pr.codigo_regional `
									+ ` and p.nome=? and r.nome=?`, [thePerfil, theRegional], "theCount").then
									(
										theCount => {
											if (theCount === undefined) {
												res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
											}
											else if (theCount > 0) {
												res.status(200).json({ 'mensagem': 'A associação Perfil x Regional já tinha sido incluída no sistema!' });
											}
											else {
												//Agora vamos incluir!
												//console.log(`theFuncionalidade:${theFuncionalidade}`);
												simpleExecSQL(` insert into perfil_regional(codigo_perfil,codigo_regional) SELECT p.codigo as codigo_perfil,` +
													` r.codigo as codigo_regional from regional r, perfil p ` +
													`where r.nome=? and p.nome=?`, [theRegional, thePerfil]).then
													(
														theresult => {
															//console.log(`1316:theresult:${theresult}`)
															if (theresult == true) {
																res.status(200).json({ 'mensagem': `Foi realizada a associação da regional ${theRegional} com o perfil ${thePerfil}!` });
															}
														},
														err3 => {
															res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
														}
													);
											}
										},
										err2 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									)
							}
							else {
								res.status(200).json({ 'mensagem': 'Não existe este perfil ou regional!' });
							}
						},
						err1 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)


			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});

/*

Operação: Atribuir perfil a regional
Entidades: Perfil, Regional
Método: DELETE
Interface: /regionalPerfil
Entrada: Um json com o nome da regional e "nome do perfil". Exemplo: {"regional":"regional campo grande","perfil":"adm_regional"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}
Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"regional\":\"regional campo grande\",\"perfil\":\"adm_regional\"}" https://localhost:3000/regionalPerfil

Funcionamento: Após o envio da regional e do perfil (perfil), o método desassocia a regional ao perfil indicado.

 */

app.delete('/regionalPerfil', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theRegional = thebody.regional;
	var thePerfil = thebody.perfil;

	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user

	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//Vamos verificar se existe a funcionalidade e o perfil
				simpleResultSQL(`select count(*) as theCount from perfil_regional pr, regional r, perfil p where pr.codigo_perfil = p.codigo and r.codigo = pr.codigo_regional `
					+ ` and p.nome=? and r.nome=?`, [thePerfil, theRegional], "theCount").then
					(
						auxCount => {
							if (auxCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (auxCount > 0) {
								// então existe ... Vamos excluir!
								simpleExecSQL(` delete from perfil_regional where codigo_perfil in (` +
									`SELECT p.codigo as codigo_perfil from perfil p where p.nome=?)` +
									`and codigo_regional in (select r.codigo as codigo_regional from regional r where r.nome=?)`, [thePerfil, theRegional]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `Foi excluída a associação da regional ${theRegional} com o perfil ${thePerfil}!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
							else {
								res.status(200).json({ 'mensagem': 'Não existe este perfil ou regional!' });
							}
						},
						err1 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)


			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});


/*
 
Operação: Incluir tipo de plantão
Entidades: Tipo de Plantão
Método: POST
Interface: /tipoplantao
Entrada: Um json com “nome” e “descrição” do tipo de plantão. Exemplo: {“nome”: “plantao regional”, “descrição”: “plantão unificado de final de semana e feriados”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"nome\":\"plantao regional\", \"descricao\":\"Plantão unificado de final de semana\”}” https://localhost:3000/tipoplantao

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na inclusão do tipo de plantão, uma mensagem de sucesso será enviada.

 */
app.post('/tipoplantao', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theNome = thebody.nome;
	var theDescricao = thebody.descricao;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a funcionalidade, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from tipo_plantao where nome=?`, [theNome], "theCount").then
					(
						theCount => {
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (theCount > 0) {
								res.status(200).json({ 'mensagem': 'O tipo de plantão já tinha sido incluido no sistema!' });
							}
							else {
								//Agora vamos incluir!								
								simpleExecSQL(`insert into tipo_plantao(nome,descricao) values (?,?)`, [theNome, theDescricao]).then
									(
										theresult => {											
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O tipo de plantao ${theNome} foi incluído com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});

/*

Operação: Excluir tipo de plantão
Entidades: Tipo de Plantão
Método: DELETE
Interface: /tipoplantao
Entrada: Um json com “nome” do tipo de plantão. Exemplo: {“nome”: “plantao regional”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"nome\":\"plantao regional\"}” https://localhost:3000/tipoplantao
 
Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. 
O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, 
uma mensagem de erro ocorrerá. Se tudo der certo na inclusão do tipo de plantão, uma mensagem de sucesso será enviada. 
 */
app.delete('/tipoplantao', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theNome = thebody.nome;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a regional, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from tipo_plantao where nome=?`, [theNome], "theCount").then
					(
						theCount => {
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': 'Erro na operação com o Banco de Dados!' });
							}
							else if (theCount == 0) {
								res.status(200).json({ 'mensagem': 'O tipo de plantão não existe no sistema!' });
							}
							else {
								//Agora vamos incluir!								
								simpleExecSQL(`delete from tipo_plantao where nome=?`, [theNome]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O tipo de plantão "${theNome}" foi removido com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});


/*
Operação: Incluir tipo de plantão
Entidades: Tipo de Plantão
Método: PUT
Interface: /tipoplantao
Entrada: Um json com “nome” e “descrição” do tipo de plantão. Exemplo: {“nome”: “plantao regional”, “descrição”: “plantão unificado de final de semana e feriados”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT -d "{\"nome\":\"plantao regional\", \"descricao\":\"Plantão unificado de final de semana\”}” https://localhost:3000/tipoplantao

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema, isto é, um usuário com perfil master. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master tentar utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na alteração do tipo de plantão, uma mensagem de sucesso será enviada. O nome do tipo de plantão não pode ser alterado, somente a descrição

 */

app.put('/tipoplantao', jsonParser, function (req, res) { //Com promises para ficar `mais simples... para quem manja de Promises`
	var thebody = req.body;
	var theNome = thebody.nome;
	var theDescricao = thebody.descricao;


	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master
	theUser = req.session.myToKen.user
	//console.log(`theUser:${theUser}`);
	isUserMaster(theUser).then(
		passou => {
			if (passou) {
				//console.log(`1300:Passou:${passou}`)
				//Agora vamos inserir a funcionalidade, se ela não existir.
				simpleResultSQL(`select count(*) as theCount from tipo_plantao where nome=?`, [theNome], "theCount").then
					(
						theCount => {
							if (theCount === undefined) {
								res.status(200).json({ 'mensagem': '2143:Erro na operação com o Banco de Dados!' });
							}
							else if (theCount == 0) {
								res.status(200).json({ 'mensagem': `O tipo de plantão ${theNome} não existe no sistema!` });
							}
							else {
								//Agora vamos incluir!								
								simpleExecSQL(`update tipo_plantao set descricao=? where nome=?`, [theDescricao,theNome]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O tipo de plantao ${theNome} foi alterado com sucesso!` });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '2158:Erro no Banco de Dados!' });
										}
									);
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': '2164:Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(200).json({ 'mensagem': 'Usuário não autorizado a realizar a operação' });
			}
		},
		err => {
			res.status(200).json({ 'mensagem': 'Erro no Banco de Dados!' });
		}
	);
});

/*
 
Operação: Listar tipos de plantão
Entidades: Tipo de plantão
Método: GET
Interface: /tiposplantao
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"a\", \"fim\":\"z\", \"ordem\":\"asc\",\"campo\":\"nome\"}" https://localhost:3000/tiposplantao

Saída: Um json com a listagem json com os dados dos tipos de plantão, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.

 
 */

app.get('/tiposplantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSON("tipo_plantao","tiposPlantao", ["codigo", "nome","descricao"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});


function stringArrayToCommaList(stringArray){
	let token = "(";
	for (i = 0; i < stringArray.length; i++) {
		if (i > 0) {
			token += ",";
		}
		token += "'";
		token += stringArray[i];
		token += "'";

	}
	token += ')';
	return token;
}

function stringArrayToCommaListAdvanced(stringArray,start,end,quotationMark){
	let token = start;
	for (i = 0; i < stringArray.length; i++) {
		if (i > 0) {
			token += ",";
		}
		token += quotationMark;
		token += stringArray[i];
		token += quotationMark;

	}
	token += end;

	return token;
}



function verificaFuncionalidade(user, funcionalidade, regionais) {
	let auxPromise = new Promise(function (resolve, reject) {
		//Let's code ...

		/*tokenRegionais = "(";
		for (i = 0; i < regionais.length; i++) {
			if (i > 0) {
				tokenRegionais += ",";
			}
			tokenRegionais += "'";
			tokenRegionais += regionais[i];
			tokenRegionais += "'";
			  
		}
		tokenRegionais += ')';*/
		tokenRegionais = (regionais !== undefined) ? stringArrayToCommaList(regionais) : undefined;


		//O usuário é master?
		isUserMaster(user).then(
			passou => {
				if (passou == true) {
					resolve(true); //master pode tudo
				}
				else if (regionais !== undefined) {
					//Vamos agora verificar se o usuário tem a funcionalidade para todas as regionais da lista
					let auxsql = `select count(*) as theCount from(` +
						`select distinct f.nome, r.nome from ` +
						`	usuario_perfil up, ` +
						`	perfil p, ` +
						`	usuario u,` +
						`	perfil_funcionalidade pf,` +
						`	funcionalidade f,` +
						`	regional r,` +
						`	perfil_regional pr ` +
						`where ` +
						`	up.codigo_perfil = p.codigo and ` +
						`	u.email=? and ` +
						`	u.codigo = up.codigo_usuario and ` +
						`	pf.codigo_perfil = up.codigo_perfil and ` +
						`	pf.codigo_funcionalidade = f.codigo and ` +
						`	pf.codigo_perfil = pr.codigo_perfil and ` +
						`	r.codigo = pr.codigo_regional and ` +
						`	r.nome in ${tokenRegionais} and ` +
						`	f.nome = ? ` +
						`)`;
					//Basta verificar se count(*) == regionais.length
					simpleResultSQL(auxsql, [user, funcionalidade], "theCount")
						.then(
							theCount => {
								if (theCount == regionais.length) {
									resolve(true);
								}
								else {
									resolve(false);
								}
							},
							erro => {
								reject("2253:Ocorreu um erro de Banco de dados!")
							}
						)
				}
				else { //Aqui é geral!
					//Vamos agora verificar se o usuário tem a funcionalidade independente de regional
					let auxsql = `select count(*) as theCount from(` +
						`select distinct f.nome from ` +
						`	usuario_perfil up, ` +
						`	perfil p, ` +
						`	usuario u,` +
						`	perfil_funcionalidade pf,` +
						`	funcionalidade f ` +
						`where ` +
						`	up.codigo_perfil = p.codigo and ` +
						`	u.email=? and ` +
						`	u.codigo = up.codigo_usuario and ` +
						`	pf.codigo_perfil = up.codigo_perfil and ` +
						`	pf.codigo_funcionalidade = f.codigo and ` +
						`	f.nome = ? ` +
						`)`;
					//Basta verificar se count(*) >0
					simpleResultSQL(auxsql, [user, funcionalidade], "theCount")
						.then(
							theCount => {
								if (theCount >0) {
									resolve(true);
								}
								else {
									resolve(false);
								}
							},
							erro => {
								reject("2253:Ocorreu um erro de Banco de dados!")
							}
					)
				}
			},
			err => {
				reject("2259:Erro de Banco de Dados!");
			}
		);

	});

	return auxPromise;
}


/*
Operação: Incluir Escala de Plantão
Entidades: Escala de Plantão
Método: POST
Interface: /escalaplantao
Entrada: Um json com “nome”, “tipo_plantao”, “início”, “fim” e “regionais”. Exemplo: {“nome”: “plantão regional fev/2023”, “tipo”: “plantão regional”,”inicio”: “01/02/2023 08:00”, “fim”: “28/02/2023 09:00”, “regionais”:[“regional1”, “regional2”...]}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}
Funcionalidade associada: inclusao_escala.
Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d “{\“nome\”: \“plantão regional fev/2023\”, 
“tipo\”: \“plantão regional\”,\”inicio\”: \“01/02/2023 08:00\”, \“fim\”: \“28/02/2023 09:00\”,\“regionais\”:[\“regional1\”, \“regional2\”]}” https://localhost:3000/escalaplantao

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “inclusão escala” em seu perfil de acessos para as regionais informadas. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “inclusão escala” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na inclusão da escala, uma mensagem de sucesso será enviada

 */
app.post('/escalaplantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var theNome = thebody.nome;
	var theTipoPlantao = thebody.tipo;
	var theInicio = thebody.inicio;
	var theFim = thebody.fim;
	var theRegionais = thebody.regionais; //Um array

	//Corrigindo datas ..
	theInicio = getDateFromBrazilianDate(theInicio).toISOString();
	theFim = getDateFromBrazilianDate(theFim).toISOString();

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "inclusão escala" para as regionais informadas
	verificaFuncionalidade(theUser, "inclusao_escala", theRegionais).then
	(
		passou => {
			if (passou == true) {
				//Vamos pegar o código do tipo de plantão
				simpleResultSQL(`select codigo from tipo_plantao where nome=?`, [theTipoPlantao], "codigo").then
					(
						theCodigoPlantao => {
							if (theCodigoPlantao === undefined) {
								res.status(200).json({ 'mensagem': `O tipo de plantão ${theTipoPlantao} não existe no sistema!` });
							}
							else {
								//Vamos verificar se a escala de plantão já existe!																
								simpleResultSQL(`select count(*) as theCount from escala_plantao where nome=?`, [theNome], "theCount").then(
									theCount => {
										if (theCount == 0) { //Podemos incluir!
											//Agora vamos incluir!		
											tokenRegionais = stringArrayToCommaList(theRegionais);
											let sql1 = `insert into escala_plantao(codigo_tipo_plantao,nome,inicio,fim,fase) values (?,?,?,?,'criada')`;
											let params1 = [theCodigoPlantao, theNome, theInicio, theFim];
											let sql2 = `insert into escala_plantao_regional(codigo_escala_plantao,codigo_regional)` +
												` select distinct ep.codigo as codigo_escala_plantao, r.codigo as codigo_regional` +
												` from escala_plantao ep, regional r where ep.nome=? and r.nome in ${tokenRegionais}`
											let params2 = [theNome];
											multipleExecSQLWithTransaction([sql1, sql2], [params1, params2]).then
											//simpleExecSQL(`insert into escala_plantao(codigo_tipo_plantao,nome,inicio,fim,fase) values (?,?,?,?,'criada')`, [theCodigoPlantao, theNome, theInicio, theFim]).then
												(
													theresult => {
														if (theresult == true) {
															// Agora vou inserir as regionais...

															res.status(200).json({ 'mensagem': `A escala de plantão "${theNome}" foi criada com sucesso!` });
														}
														else {
															res.status(500).json({ 'mensagem': '2308:Erro no Banco de Dados!' });
														}
													},
													err3 => {
														res.status(200).json({ 'mensagem': '2320:Erro no Banco de Dados!' });
													}
												);
										}
										else { //Já incluído
											res.status(500).json({ 'mensagem': 'Esta escala de plantão já tinha sido incluída!' });
										}
									}, erroCount => {
										res.status(500).json({ 'mensagem': '2314:Erro no Banco de Dados!' });
									}
								)								
							}
						},
						err2 => {
							res.status(200).json({ 'mensagem': '2312:Erro no Banco de Dados!' });
						}
					)
			}
			else {
				res.status(500).json({ 'mensagem': `Usuário não autorizado para incluir a escala nas regionais ${theRegionais.toString()}` });
            }
		},
		erro => {
			res.status(500).json({ 'mensagem': erro });
        }
	)


});

/*
Operação: Excluir Escala de Plantão
Entidades: Escala de Plantão
Método: DELETE
Interface: /escalaplantao
Entrada: Um json com o nome da escala de plantão a excluir. Exemplo: {“nome”: “plantão regional fev/2023” }
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}
Funcionalidade associada: Inclusão escala.

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"nome\": \"plantão regional fev/2023\"}" https://localhost:3000/escalaplantao

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “inclusão escala” em seu perfil de acessos para as regionais informadas. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “exclusão escala” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão da escala, uma mensagem de sucesso será enviada.


*/

app.delete('/escalaplantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var theNome = thebody.nome;
	


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Vamos pegar as regionais associadas à escala
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
								 ` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( `+
								 `  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep `+
		`  where ep.nome = ?))`, [theNome], 'regional').then
	(
		theRegionais => {
			//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "inclusão escala" para as regionais informadas
			verificaFuncionalidade(theUser, "exclusao_escala", theRegionais).then
				(
					passou => {
						if (passou == true) {
							//Vamos verificar se a escala de plantão já existe!
							simpleResultSQL(`select count(*) as theCount from escala_plantao where nome=?`, [theNome], "theCount").then(
								theCount => {
									if (theCount > 0) { //Podemos incluir!
										//Agora vamos deletar!		
										let sql1 = `delete from escala_plantao_regional where ` +
											` codigo_escala_plantao in ( select distinct ep.codigo as codigo_escala_plantao ` +
											` from escala_plantao ep where ep.nome=?)`
										let params1 = [theNome];
										let sql2 = `delete from escala_plantao where nome=?`;
										let params2 = [theNome];
										multipleExecSQLWithTransaction([sql1, sql2], [params1, params2]).then
											//simpleExecSQL(`delete from escala_plantao where nome=?`, [theNome]).then
											(
												theresult => {
													if (theresult == true) {
														res.status(200).json({ 'mensagem': `A escala de plantão "${theNome}" foi excluída com sucesso!` });
													}
													else {
														res.status(500).json({ 'mensagem': '2308:Erro no Banco de Dados!' });
													}
												},
												err3 => {
													res.status(200).json({ 'mensagem': '2320:Erro no Banco de Dados!' });
												}
											);
									}
									else { //Já incluído
										res.status(500).json({ 'mensagem': 'Esta escala de plantão já não existe!' });
									}
								}, erroCount => {
									res.status(500).json({ 'mensagem': '2314:Erro no Banco de Dados!' });
								}
							)

						}
						else {
							res.status(500).json({ 'mensagem': `Usuário não autorizado para excluir a escala nas regionais ${theRegionais.toString()}` });
						}
					},
					erro => {
						res.status(500).json({ 'mensagem': erro });
					}
				)
		},
		err => {
			res.status(500).json({ 'mensagem': '2489:Erro no Banco de Dados!' });
		}
	)


});


/*

Operação: Alterar Escala de Plantão
Entidades: Escala de Plantão
Método: PUT
Interface: /escalaplantao
Entrada: Um json com “nome”, “tipo_plantao”, “início”, “fim” e “regionais”. Exemplo: {“nome”: “plantão regional fev/2023”, “tipo”: “plantão regional”,”inicio”: “01/02/2023 08:00”, “fim”: “28/02/2023 09:00”, “regionais”:[“regional1”, “regional2”...]}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}
Funcionalidade associada: alteracao_escala.

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT -d “{\“nome\”: \“plantão regional fev/2023\”, \“tipo\”: \“plantão regional\”,\”inicio\”: \“01/02/2023 08:00\”, \“fim\”: \“28/02/2023 09:00\” \“regionais\”:[\“regional1\”, \“regional2\”]}” https://localhost:3000/escalaplantao

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “alteracao_escala” em seu perfil de acessos para as regionais associadas à escala de plantão que se pretente alterar . O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “alteracao_escala” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na alteração da escala, uma mensagem de sucesso será enviada.

Tudo pode ser alterado, menos o nome da escala. As regionais associadas à escala de plantão também podem ser alteradas, desde que o usuário tenha as devidas permissões.


*/
app.put('/escalaplantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var theNome = thebody.nome;
	var theTipoPlantao = thebody.tipo;
	var theInicio = thebody.inicio;
	var theFim = thebody.fim;

	//Corrigindo datas ..
	theInicio = getDateFromBrazilianDate(theInicio).toISOString();
	theFim = getDateFromBrazilianDate(theFim).toISOString();


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Vamos pegar as regionais associadas à escala
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNome], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "inclusão escala" para as regionais informadas
				verificaFuncionalidade(theUser, "alteracao_escala", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos pegar o código do tipo de plantão
								simpleResultSQL(`select codigo from tipo_plantao where nome=?`, [theTipoPlantao], "codigo").then
									(
										theCodigoPlantao => {
											if (theCodigoPlantao === undefined) {
												res.status(200).json({ 'mensagem': `O tipo de plantão ${theTipoPlantao} não existe no sistema!` });
											}
											else {
												//Vamos verificar se a escala de plantão já existe!																
												simpleResultSQL(`select count(*) as theCount from escala_plantao where nome=?`, [theNome], "theCount").then(
													theCount => {
														if (theCount > 0) { //Podemos alterar!
															//Agora vamos alterar!																	
															tokenRegionais = stringArrayToCommaList(theRegionais);
															let sql1 = `update escala_plantao set inicio=?,fim=?,codigo_tipo_plantao=? where nome=?`;
															let params1 = [theInicio, theFim,theCodigoPlantao,theNome];
															//multipleExecSQLWithTransaction([sql1, sql2], [params1, params2]).then
															simpleExecSQL(sql1,params1).then
																(
																	theresult => {
																		if (theresult == true) {
																			// Agora vou inserir as regionais...

																			res.status(200).json({ 'mensagem': `A escala de plantão "${theNome}" foi alterada com sucesso!` });
																		}
																		else {
																			res.status(500).json({ 'mensagem': '2308:Erro no Banco de Dados!' });
																		}
																	},
																	err3 => {
																		res.status(200).json({ 'mensagem': '2320:Erro no Banco de Dados!' });
																	}
																);
														}
														else { //Já incluído
															res.status(500).json({ 'mensagem': 'Esta escala de plantão não existe!' });
														}
													}, erroCount => {
														res.status(500).json({ 'mensagem': '2314:Erro no Banco de Dados!' });
													}
												)
											}
										},
										err2 => {
											res.status(200).json({ 'mensagem': '2312:Erro no Banco de Dados!' });
										}
									)
							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado para incluir a escala nas regionais ${theRegionais.toString()}` });
							}
						},
						erro => {
							res.status(500).json({ 'mensagem': erro });
						}
					)


				
			},
			err => {
				res.status(500).json({ 'mensagem': '2489:Erro no Banco de Dados!' });
			}
		)


});

/*
Operação: Listar Escalas de Platão
Entidades: Escala de Plantão
Método: GET
Interface: /escala_plantoes
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"a\", \"fim\":\"z\", \"ordem\":\"asc\",\"campo\":\"nome\"}" https://localhost:3000/regionais

Saída: Um json com a listagem json com os dados das regionais, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.

*/

app.get('/escala_plantoes', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;
	
	listSQLtoJSON("escala_plantao", "escalasPlantao", ["codigo", "nome", "inicio","fim","fase"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/*
Operação: Incluir Estado
Entidades: Estado
Método: POST
Interface: /estado
Entrada: Um json com o nome e sigla do estado
Exemplo de json de entrada: {“nome”: “Mato Grosso do Sul”, “sigla”:”MS”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d “{\“nome\”: \“Mato Grosso do Sul\”, \“sigla\”:\”MS\”}” https://localhost:3000/estado

Funcionalidade associada: cadastro_estado

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a 
	funcionalidade “cadastro_estado” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. 
	Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_estado” tenta utilizar a operação, uma mensagem de erro ocorrerá. 
	Se tudo der certo no cadastro do estado, uma mensagem de sucesso será enviada.

*/
app.post('/estado', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theSigla = thebody.sigla;
	

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "inclusão escala" para as regionais informadas
	verificaFuncionalidade(theUser, "cadastro_estado", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se a estado já foi cadastrado já existe!																
					simpleResultSQL(`select count(*) as theCount from estado where nome=?`, [theNome], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Agora vamos incluir!		
								simpleExecSQL(`insert into estado(nome,sigla) values (?,?)`, [theNome,theSigla]).then
									(
										theresult => {
											if (theresult == true) {												
												res.status(200).json({ 'mensagem': `O estado "${theNome}" foi cadastrado com sucesso!` });
											}
											else {
												res.status(500).json({ 'mensagem': '2769:Erro no Banco de Dados!' });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '2773:Erro no Banco de Dados!' });
										}
									);
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O Estado ${theNome}! já tinha sido cadastrado!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '2781:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o estado ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2791:mensagem': erro });
			}
		)


});

/*
Operação: Incluir Cidade
Entidades: Cidade, Estado
Método: POST
Interface: /cidade
Entrada: Um json com o nome da cidade e a sigla do estado
Exemplo de json de entrada: {“nome”: “Campo Grande”, “sigla_estado”:”MS”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"nome\": \"Campo Grande\", \"sigla_estado\":\"MS\"}" https://localhost:3000/cidade 

Funcionalidade associada: cadastro_cidade
Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_cidade” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_cidade” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro da cidade, uma mensagem de sucesso será enviada.
*/
app.post('/cidade', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theSiglaEstado = thebody.sigla_estado;


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "inclusão escala" para as regionais informadas
	verificaFuncionalidade(theUser, "cadastro_cidade", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se a cidade já foi cadastrada																
					simpleResultSQL(`select count(*) as theCount from cidade where nome=? and codigo_estado IN (select codigo as codigo_estado from estado where sigla=?)`, [theNome,theSiglaEstado], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Agora vamos incluir!		
								simpleExecSQL(`insert into cidade(nome,codigo_estado) select ? as nome, codigo as codigo_estado from estado where sigla=?`, [theNome, theSiglaEstado]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `A cidade "${theNome}" foi cadastrada com sucesso!` });
											}
											else {
												res.status(500).json({ 'mensagem': '2838:Erro no Banco de Dados!' });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '2842:Erro no Banco de Dados!' });
										}
									);
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `A cidade ${theNome}! já tinha sido cadastrada!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '2850:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o estado ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2860:mensagem': erro });
			}
		)


});

/*

Operação: Incluir Secretaria
Entidades: Secretaria, Cidade, Regional
Método: POST
Interface: /secretaria
Entrada: Um json com o nome da secretaria, sigla da secretaria, nome da cidade, e nome da regional.
Exemplo de json de entrada: {"nome": "1ª Vara Federal de Corumbá", "sigla":"1VCRBA", "cidade":"Corumbá","sigla_estado":"MS","regional":"regional campo grande"}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d {\“nome\”: \“1ª Vara Federal de Corumbá\”, \“sigla\”:\”1VCRBA\”, \“cidade\”:\”Corumbá\”,\”regional\”:\”regional campo grande\”} https://localhost:3000/secretaria

Funcionalidade associada: cadastro_secretaria

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_secretaria” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_secretaria” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro da secretaria, uma mensagem de sucesso será enviada.

*/
app.post('/secretaria', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theSiglaSecretaria = thebody.sigla;	
	let theCidade = thebody.cidade;
	let theSiglaEstado = thebody.sigla_estado;
	let theRegional = thebody.regional;
	


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_secretaria" para as regionais informadas
	verificaFuncionalidade(theUser, "cadastro_secretaria", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se a secretaria já foi cadastrada																
					simpleResultSQL(`select count(*) as theCount from secretaria where nome=? `, [theNome], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Vamos verificar se a cidade está cadastrada
								simpleResultSQL(`select count(*) as theCount from cidade c, regional r where c.nome=? and r.nome=? `, [theCidade,theRegional], "theCount").then(
									theCount2 => {
										if (theCount2 > 0) {
											//Agora vamos incluir!		
											simpleExecSQL(`insert into secretaria(codigo_regional,codigo_cidade,nome,sigla)` +
												` select distinct r.codigo as codigo_regional, c.codigo as codigo_cidade,? as nome, ? as sigla` +
												` from regional r, cidade c, estado e where c.nome=? and c.codigo_estado = e.codigo and e.sigla = ? and r.nome=?`,
												[theNome, theSiglaSecretaria, theCidade, theSiglaEstado, theRegional]).then
												(
													theresult => {
														if (theresult == true) {
															res.status(200).json({ 'mensagem': `A secretaria "${theNome}" foi cadastrada com sucesso!` });
														}
														else {
															res.status(500).json({ 'mensagem': '2919:Erro no Banco de Dados!' });
														}
													},
													err3 => {
														res.status(200).json({ 'mensagem': '2923:Erro no Banco de Dados!' });
													}
												);
										}
										else {
											res.status(500).json({ 'mensagem': `A cidade ${theCidade} ou regional ${theRegional} não existe!` });
										}
									},
									erro2 => {
										res.status(500).json({ 'mensagem': '2936:Erro no Banco de Dados!' });
									}
								)
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `A secretaria ${theNome}! já tinha sido cadastrada!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '2931:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o estado ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2941:mensagem': erro });
			}
		)


});


/*
Operação: Incluir Juiz
Entidades: Juiz
Método: POST
Interface: /regional
Entrada: Um json com nome do juiz, email, antiguidade, cargo, rf do juiz e a sigla da secretaria. Exemplo: {“nome”: “Fulana juíza da silva”, “antiguidade”:”5”, “rf_juiz”:”332”,”cargo”:”Juíza Titular da 1ª Vara de Corumbá”,”sigla_vara”:”1VCRBA”}

Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d 
{\"nome\": \"Fulana juíza da silva\","email":"fdsilva@trf3.jus.br", \"antiguidade\":\"5\", \"rf_juiz\":\"332\",\"cargo\":\"Juíza Titular da 1ª Vara de Corumbá\",\"sigla_vara\":\"1VCRBA\"} https://localhost:3000/regional

Funcionalidade associada: cadastro__magistrado

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_magistrado” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_magistrado” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro do magistrado, uma mensagem de sucesso será enviada.

*/
app.post('/juiz', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theEmail = thebody.email;
	let theAntiguidade = thebody.antiguidade;
	let theRfJuiz = thebody.rf_juiz;
	let theCargo = thebody.cargo;
	let theSiglaVara = thebody.sigla_vara;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadstro_magistrado"
	verificaFuncionalidade(theUser, "cadastro_magistrado", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se o magistrado já foi cadastrado															
					simpleResultSQL(`select count(*) as theCount from juiz where rf=?`, [theRfJuiz], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Agora vamos incluir!		
								simpleExecSQL(`insert into juiz(cod_secretaria,rf,nome,email,antiguidade,cargo)` +
									` select s.codigo as cod_secretaria,? as rf, ? as nome, ? as email, ? as antiguidade, ? as cargo ` +
									` from secretaria s where s.sigla =?`, [theRfJuiz, theNome,theEmail,theAntiguidade,theCargo, theSiglaVara]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O juiz "${theNome}" foi cadastrado com sucesso!` });
											}
											else {
												res.status(500).json({ 'mensagem': '3012:Erro no Banco de Dados!' });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '3016:Erro no Banco de Dados!' });
										}
									);
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O juiz ${theNome}! já tinha sido cadastrado!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '3024:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o juiz ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2860:mensagem': erro });
			}
		)


});

/*
Operação: Incluir Opção de escolha 
Entidades: Escala de Plantão, Opção de Escolha, Juiz
Método: POST
Interface: /opcao_escolha_plantao
Entrada: Um json com o rf do juiz, o nome da escala de plantão, a quantidade de escolhas, o início do prazo de escolha e o fim do prazo de escolha. Exemplo: {“rf_juiz”: “257”, “escala”: “plantão regional fev/2023”, “n_escolhas”: “10”, “inicio_prazo_escolha”:”01/01/2023”, “fim_prazo_escolha”:”10/01/2023”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d {"rf_juiz": "257", "escala": "plantão regional fev/2023", 
"n_escolhas": "10", "inicio_prazo_escolha":"01/01/2023", "fim_prazo_escolha":"10/01/2023"} https://localhost:3000/ opcao_escolha_plantao

Funcionalidade associada: cadastro_op_escolha_magistrado
Funcionamento: Refere-se às opções de escolha que determinado magistrado possui em uma determinada escala de plantão. A ideia é que o “administrador da escala” 
cadastre as escolhas possíveis para cada magistrado de forma manual ou automática, baseando-se na antiguidade de cada juiz. De qualquer modo, tais procedimentos 
vão acionar esta rotina. O campo “se_finalizado” da opção de escolha é inicialmente 0, uma vez que o magistrado não terá finalizado ainda suas escolhas.

Tal método somente pode ser utilizado pelo administrador do sistema (perfil master), por todos os usuários que possuam a funcionalidade 
“cadastro_op_escolha_magistrado” em seu perfil de acessos para as regionais associadas à escala de plantão que terá as opções de escolha cadastradas. 
O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_op_escolha_magistrado” 
tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro das opções de escolha, uma mensagem de sucesso será enviada.

*/

app.post('/opcao_escolha_plantao', jsonParser, function (req, res) {	
	let thebody = req.body;
	let theRfJuiz = thebody.rf_juiz;
	let theNomeEscala = thebody.escala;
	let theNEscolhas = thebody.n_escolhas;
	let auxInicioPrazoEscolha = thebody.inicio_prazo_escolha;
	let auxFimPrazoEscolha = thebody.fim_prazo_escolha;

	//Ajustando data para o formato do objeto Date
	let theInicioPrazoEscolha = getDateFromBrazilianDate(auxInicioPrazoEscolha).toISOString();
	let theFimPrazoEscolha = getDateFromBrazilianDate(auxFimPrazoEscolha).toISOString();

	//Quem é o usuário?	
	theUser = req.session.myToKen.user
	
	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNomeEscala], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_op_escolha_magistrado" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "cadastro_op_escolha_magistrado", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos verificar se a opção de escolha já está cadastrada, isto é, se existe uma opção de escolha cadastrada para a escala														
								simpleResultSQL(`select count(*) as theCount from opcao_escolha oe, escala_plantao ep where ep.nome=? ` +
												` and oe.codigo_escala = ep.codigo and oe.rf_juiz=?`, [theNomeEscala,theRfJuiz], "theCount").then(
									theCount => {
										if (theCount == 0) { //Podemos incluir!
											//Vamos verificar se existe escala e o juiz
											simpleResultSQL(`select count(*) as theCount from escala_plantao ep, juiz j where ep.nome=? and j.rf=? `,
												[theNomeEscala, theRfJuiz], "theCount").then(
												theCount2 => {
													if (theCount2 > 0) {
														//Podemos	
														simpleExecSQL(`insert into opcao_escolha(codigo_escala, rf_juiz, n_escolhas,inicio_prazo,fim_prazo,se_finalizado)` +
															` select distinct ep.codigo as codigo_escala, ? as rf_juiz, ? as n_escolhas, ? as inicio_prazo,` +
															` ? as fim_prazo, '0' as se_finalizado from escala_plantao ep where ep.nome=?`,
															[theRfJuiz, theNEscolhas, theInicioPrazoEscolha, theFimPrazoEscolha,theNomeEscala]).then
															(
																theresult => {
																	if (theresult == true) {
																		res.status(200).json({ 'mensagem': `A opção de escolha para o juiz de rf "${theRfJuiz}" foi cadastrada com sucesso!` });
																	}
																	else {
																		res.status(500).json({ 'mensagem': '2919:Erro no Banco de Dados!' });
																	}
																},
																err3 => {
																	res.status(200).json({ 'mensagem': '2923:Erro no Banco de Dados!' });
																}
															);
													}
													else {
														res.status(500).json({ 'mensagem': `O juiz de rf ${theRfJuiz} ou escala ${theNomeEscala} não existem!` });
													}
												},
												erro2 => {
													res.status(500).json({ 'mensagem': '2936:Erro no Banco de Dados!' });
												}
											)
										}
										else { //Já incluído
											res.status(500).json({ 'mensagem': `A opção de escolha já tinha sido cadastrada!` });
										}
									}, erroCount => {
										res.status(500).json({ 'mensagem': '2931:Erro no Banco de Dados!' });
									}
								)

							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar a opcao de escolha!` });
							}
						},
						erro => {
							res.status(500).json({ '2941:mensagem': erro });
						}
					)

			
			},
			erro1 => {
				res.status(500).json({ 'mensagem': '3145:Erro no Banco de Dados!' });
			}
		)

	

});

/*
Operação: Remover Opção de escolha 
Entidades: Escala de Plantão, Opção de Escolha, Juiz
Método: DELETE
Interface: /opcao_escolha_plantao
Entrada:  Um json com o rf do juiz, o nome da escala de plantão
Exemplo: {“rf_juiz”: “257”, “escala”: “plantão regional fev/2023” }
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d “{\"rf_juiz": \"257", \"escala\": \"plantão regional fev/2023\"}” https://localhost:3000/ opcao_escolha_plantao

Funcionalidade associada: exclusao_op_escolha_magistrado 

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master), por todos os usuários que possuam a funcionalidade 
“exclusao_op_escolha_magistrado” em seu perfil de acessos para as regionais associadas à escala de plantão que terá as opções de escolha cadastradas. 
O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “exclusao_op_escolha_magistrado” 
tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão da opções de escolha, uma mensagem de sucesso será enviada.

*/
app.delete('/opcao_escolha_plantao', jsonParser, function (req, res) {
	let thebody = req.body;
	let theRfJuiz = thebody.rf_juiz;
	let theNomeEscala = thebody.escala;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNomeEscala], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_op_escolha_magistrado" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "exclusao_op_escolha_magistrado", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos verificar se a opção de escolha já está cadastrada, isto é, se existe uma opção de escolha cadastrada para a escala														
								simpleResultSQL(`select count(*) as theCount from opcao_escolha oe, escala_plantao ep where ep.nome=? ` +
									` and oe.codigo_escala = ep.codigo and oe.rf_juiz=?`, [theNomeEscala, theRfJuiz], "theCount").then(
										theCount => {
											if (theCount > 0) { //Podemos incluir!
												//Vamos verificar se existe escala e o juiz
												simpleResultSQL(`select count(*) as theCount from escala_plantao ep, juiz j where ep.nome=? and j.rf=? `,
													[theNomeEscala, theRfJuiz], "theCount").then(
														theCount2 => {
															if (theCount2 > 0) {
																//Podemos excluir
																simpleExecSQL(`delete from opcao_escolha where codigo_escala IN ` +
																	` (select codigo as codigo_escala from escala_plantao where nome=?) `
																	+ ` and rf_juiz=?`,[theNomeEscala,theRfJuiz]).then
																	(
																		theresult => {
																			if (theresult == true) {
																				res.status(200).json({ 'mensagem': `A opção de escolha para o juiz de rf "${theRfJuiz}" foi removida com sucesso!` });
																			}
																			else {
																				res.status(500).json({ 'mensagem': '3217:Erro no Banco de Dados!' });
																			}
																		},
																		err3 => {
																			res.status(200).json({ 'mensagem': '3221:Erro no Banco de Dados!' });
																		}
																	);
															}
															else {
																res.status(500).json({ 'mensagem': `O juiz de rf ${theRfJuiz} ou escala ${theNomeEscala} não existem!` });
															}
														},
														erro2 => {
															res.status(500).json({ 'mensagem': '3230:Erro no Banco de Dados!' });
														}
													)
											}
											else { //Já incluído
												res.status(500).json({ 'mensagem': `A opção de escolha já não existe!` });
											}
										}, erroCount => {
											res.status(500).json({ 'mensagem': '2931:Erro no Banco de Dados!' });
										}
									)

							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a remover a opcao de escolha!` });
							}
						},
						erro => {
							res.status(500).json({ '3248:mensagem': erro });
						}
					)


			},
			erro1 => {
				res.status(500).json({ 'mensagem': '3145:Erro no Banco de Dados!' });
			}
		)



});



/*
Operação: Alterar Opção de escolha 
Entidades: Escala de Plantão, Opção de Escolha, Juiz
Método: PUT
Interface: /opcao_escolha_plantao
Entrada: Um json com o rf do juiz, o nome da escala de plantão, a quantidade de escolhas, o início do prazo de escolha e o fim do prazo de escolha. Exemplo: {“rf_juiz”: “257”, “escala”: “plantão regional fev/2023”, “n_escolhas”: “10”, “inicio_prazo_escolha”:”01/01/2023”, “fim_prazo_escolha”:”10/01/2023”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d {"rf_juiz": "257", "escala": "plantão regional fev/2023", "n_escolhas": "10", "inicio_prazo_escolha":"01/01/2023", "fim_prazo_escolha":"10/01/2023"} https://localhost:3000/ opcao_escolha_plantao

Funcionalidade associada: alterar_op_escolha_magistrado 

Funcionamento: Refere-se às opções de escolha que determinado magistrado possui em uma determinada escala de plantão. A ideia é que o “administrador da escala” cadastre as escolhas possíveis para cada magistrado de forma manual ou automática, baseando-se na antiguidade de cada juiz. De qualquer modo, tais procedimentos vão acionar esta rotina. O campo “se_finalizado” da opção de escolha é inicialmente “0”, uma vez que o magistrado não terá finalizado ainda suas escolhas.

Tal método somente pode ser utilizado pelo administrador do sistema (perfil master), por todos os usuários que possuam a funcionalidade “alterar_op_escolha_magistrado” em seu perfil de acessos para as regionais associadas à escala de plantão que terá as opções de escolha cadastradas. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “alterar_op_escolha_magistrado” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na alteração das opções de escolha, uma mensagem de sucesso será enviada.

Obs: Não pode ser alterado o rf_juiz nem o nome da escala de plantão associada.

*/
app.put('/opcao_escolha_plantao', jsonParser, function (req, res) {
	let thebody = req.body;
	let theRfJuiz = thebody.rf_juiz;
	let theNomeEscala = thebody.escala;
	let theNEscolhas = thebody.n_escolhas;
	let theInicioPrazoEscolha = thebody.inicio_prazo_escolha;
	let theFimPrazoEscolha = thebody.fim_prazo_escolha;

	//Ajustando data para o formato do objeto Date
	theInicioPrazoEscolha = getDateFromBrazilianDate(theInicioPrazoEscolha).toISOString();
	theFimPrazoEscolha = getDateFromBrazilianDate(theFimPrazoEscolha).toISOString();


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNomeEscala], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_op_escolha_magistrado" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "alterar_op_escolha_magistrado", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos verificar se a opção de escolha já está cadastrada, isto é, se existe uma opção de escolha cadastrada para a escala														
								simpleResultSQL(`select count(*) as theCount from opcao_escolha oe, escala_plantao ep where ep.nome=? ` +
									` and oe.codigo_escala = ep.codigo and oe.rf_juiz=?`, [theNomeEscala, theRfJuiz], "theCount").then(
										theCount => {
											if (theCount >0) { //Podemos incluir!
												//Vamos verificar se existe escala e o juiz
												simpleResultSQL(`select count(*) as theCount from escala_plantao ep, juiz j where ep.nome=? and j.rf=? `,
													[theNomeEscala, theRfJuiz], "theCount").then(
														theCount2 => {
															if (theCount2 > 0) {
																//Podemos	
																simpleExecSQL(`update opcao_escolha set n_escolhas=?, inicio_prazo=?,  fim_prazo=? where rf_juiz=? and ` +
																	` codigo_escala in (select ep.codigo as codigo_escala from escala_plantao ep where ep.nome=?)`,
																	[theNEscolhas, theInicioPrazoEscolha, theFimPrazoEscolha, theRfJuiz, theNomeEscala]).then
																	(
																		theresult => {
																			if (theresult == true) {
																				res.status(200).json({ 'mensagem': `A opção de escolha para o juiz de rf "${theRfJuiz}" foi alterada com sucesso!` });
																			}
																			else {
																				res.status(500).json({ 'mensagem': '2919:Erro no Banco de Dados!' });
																			}
																		},
																		err3 => {
																			res.status(200).json({ 'mensagem': '2923:Erro no Banco de Dados!' });
																		}
																	);
															}
															else {
																res.status(500).json({ 'mensagem': `O juiz de rf ${theRfJuiz} ou escala ${theNomeEscala} não existem!` });
															}
														},
														erro2 => {
															res.status(500).json({ 'mensagem': '2936:Erro no Banco de Dados!' });
														}
													)
											}
											else { //Já incluído
												res.status(500).json({ 'mensagem': `A opção de escolha não existe!` });
											}
										}, erroCount => {
											res.status(500).json({ 'mensagem': '2931:Erro no Banco de Dados!' });
										}
									)

							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar a opcao de escolha!` });
							}
						},
						erro => {
							res.status(500).json({ '2941:mensagem': erro });
						}
					)


			},
			erro1 => {
				res.status(500).json({ 'mensagem': '3145:Erro no Banco de Dados!' });
			}
		)



});


/*

Operação: Listar opções de escolha
Entidades: Opção de Escolha
Método: GET
Interface: /opcao_escolha_plantao

Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 


{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}



Headers: e-token no header “x-access-token”


Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"100\", \"ordem\":\"asc\",\"campo\":\"codigo_escala_plantao\"}" https://localhost:3000/opcao_escolha_plantao


*/
app.get('/opcoes_escolha_plantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSON("opcao_escolha", "opcoesEscolha", ["codigo_escala","codigo", "rf_juiz", "inicio_prazo", "fim_prazo", "se_finalizado"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/*
Operação: Incluir Plantão 
Entidades: Escala de Plantão, Plantão
Método: POST
Interface: /plantao
Entrada: Um json com “nome da escala de plantão”, “inicio_plantao”, “fim_plantao” e “n_magistrados”
Exemplo: {“escala”: “plantão regional fev/2023”, “inicio_plantao”: ”01/01/2023”, “fim_plantao”:”10/01/2023”, “n_magistrados”:”2”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d “{\“escala\”: \“plantão regional fev/2023\”, \“inicio_plantao\”: \”01/01/2023\”, \“fim_plantao\”:\”10/01/2023\”,\“n_magistrados\”:\”2\”}” https://localhost:3000/plantao

Funcionalidade associada: cadastro_plantao 

Funcionamento: Refere-se aos plantões que fazem parte de uma “escala de plantões”. Quando o “administrador da escala” inclui no sistema uma escala de plantão, ele deve também informar quais plantões farão parte da escala e em quais datas. Após montada a escala, os magistrados poderão em momento posterior escolher os plantões que desejam atuar. Em geral, teremos somente 1 juiz plantonista por plantão. Mas existem situações peculiares onde 2 ou mais magistrados podem atuar em um mesmo plantão (n_magistrados). Um plantão tem um início e um fim. 

Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_plantao” em seu perfil de acessos para as regionais associadas à escala de plantão que terá as opções de escolha cadastradas. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_plantao” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro do plantão, uma mensagem de sucesso será enviada.

Obs:
(1)	Não podem existir dois plantões com períodos cruzados, isto é, um plantão não pode se iniciar antes do término do anterior.

*/
app.post('/plantao', jsonParser, function (req, res) {
	let thebody = req.body;	
	let theNomeEscala = thebody.escala;
	let theInicioPlantao = thebody.inicio_plantao;
	let theFimPlantao = thebody.fim_plantao;
	let theNMagistrados = thebody.n_magistrados;


	//Corrigir datas!
	theFimPlantao = getDateFromBrazilianDate(theFimPlantao).toISOString();
	theInicioPlantao = getDateFromBrazilianDate(theInicioPlantao).toISOString();

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNomeEscala], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_plantao" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "cadastro_plantao", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos verificar se o plantao já está cadastrado, isto é, se existe um plantão com mesma escala, inicio e fim (se igual ou cruza)
								simpleResultSQL(`select count(*) as theCount from plantao p, escala_plantao ep ` +
									` where p.codigo_escala=ep.codigo and ep.nome=? and ` +									
									` ((p.inicio <= ? and p.fim >= ?) or ` + 
									` (p.inicio <= ? and p.fim >= ?)) `, [theNomeEscala, theInicioPlantao, theInicioPlantao, theFimPlantao, theFimPlantao], "theCount").then(
										theCount => {
											if (theCount == 0) { //Podemos incluir!
												//Vamos verificar se existe a escala
												simpleResultSQL(`select count(*) as theCount from escala_plantao ep where ep.nome=? `,
													[theNomeEscala], "theCount").then(
														theCount2 => {
															if (theCount2 > 0) {
																//Podemos! Vamos incluir.
																simpleExecSQL(`insert into plantao(codigo_escala,inicio,fim,n_magistrados)` +
																	` select distinct ep.codigo as codigo_escala, ? as inicio,` +
																	` ? as fim, ? as n_magistrados from escala_plantao ep where ep.nome=?`,
																	[theInicioPlantao, theFimPlantao, theNMagistrados, theNomeEscala]).then
																	(
																		theresult => {
																			if (theresult == true) {
																				res.status(200).json({ 'mensagem': `O plantao foi cadastrado com sucesso!` });
																			}
																			else {
																				res.status(500).json({ 'mensagem': '3486:Erro no Banco de Dados!' });
																			}
																		},
																		err3 => {
																			res.status(200).json({ 'mensagem': '3490:Erro no Banco de Dados!' });
																		}
																	);
															}
															else {
																res.status(500).json({ 'mensagem': `A escala ${theNomeEscala} não existe!` });
															}
														},
														erro2 => {
															res.status(500).json({ 'mensagem': '3499:Erro no Banco de Dados!' });
														}
													)
											}
											else { //Já incluído
												res.status(500).json({ 'mensagem': `O plantão já tinha sido cadastrado, ou deu cruzamento de plantões!` });
											}
										}, erroCount => {
											res.status(500).json({ 'mensagem': '2931:Erro no Banco de Dados!' });
										}
									)

							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o plantão!` });
							}
						},
						erro => {
							res.status(500).json({ '2941:mensagem': erro });
						}
					)


			},
			erro1 => {
				res.status(500).json({ 'mensagem': '3145:Erro no Banco de Dados!' });
			}
		)



});

/*
Operação: Remover Plantão 
Entidades: Escala de Plantão, Plantão
Método: DELETE
Interface: /plantao
Entrada: Um json com “nome da escala de plantão”, “inicio_plantao”, “fim_plantao”
Exemplo: {“escala”: “plantão regional fev/2023”, “inicio_plantao”: ”01/01/2023”, “fim_plantao”:”10/01/2023”}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d “{\“escala\”: \“plantão regional fev/2023\”, \“inicio_plantao\”: \”01/01/2023\”, \“fim_plantao\”:\”10/01/2023\”}” https://localhost:3000/plantao

Funcionalidade associada: exclusao_plantao 

Funcionamento:  Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “exclusao_plantao” em seu perfil de acessos para as regionais associadas à escala de plantão que terá as opções de escolha cadastradas. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “exclusao_plantao” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão do plantão, uma mensagem de sucesso será enviada.

*/
app.delete('/plantao', jsonParser, function (req, res) {
	let thebody = req.body;
	let theNomeEscala = thebody.escala;
	let theInicioPlantao = thebody.inicio_plantao;
	let theFimPlantao = thebody.fim_plantao;

	//Corrigir datas!
	theFimPlantao = getDateFromBrazilianDate(theFimPlantao).toISOString();
	theInicioPlantao = getDateFromBrazilianDate(theInicioPlantao).toISOString();

	

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [theNomeEscala], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "exclusao_plantao" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "exclusao_plantao", theRegionais).then
					(
						passou => {
							if (passou == true) {
								//Vamos verificar se o plantao já está cadastrado, isto é, se existe um plantão com mesma escala, inicio e fim (se igual ou cruza)
								simpleResultSQL(`select count(*) as theCount from plantao p, escala_plantao ep ` +
									` where p.codigo_escala=ep.codigo and ep.nome=? and ` +
									` p.inicio = ? and p.fim = ?`, [theNomeEscala, theInicioPlantao, theFimPlantao], "theCount").then(
										theCount => {
											if (theCount > 0) {
												//Podemos! Vamos excluir
												simpleExecSQL(`delete from plantao where codigo_escala IN (` +
													` select distinct ep.codigo as codigo_escala from escala_plantao ep where ep.nome=?) ` +
													` and inicio=? and fim=? `,[theNomeEscala, theInicioPlantao, theFimPlantao]).then
												(
														theresult => {
															if (theresult == true) {
																res.status(200).json({ 'mensagem': `O plantao foi excluído com sucesso!` });
															}
															else {
																res.status(500).json({ 'mensagem': '3588:Erro no Banco de Dados!' });
															}
														},
														err3 => {
															res.status(200).json({ 'mensagem': '3592:Erro no Banco de Dados!' });
														}
												);
											}
											else { //Já incluído
												res.status(500).json({ 'mensagem': `O plantão não existe!` });
											}
										}, erroCount => {
											res.status(500).json({ 'mensagem': '3600:Erro no Banco de Dados!' });
										}
									)

							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a excluir o plantão!` });
							}
						},
						erro => {
							res.status(500).json({ '3610:mensagem': erro });
						}
					)


			},
			erro1 => {
				res.status(500).json({ 'mensagem': '3617:Erro no Banco de Dados!' });
			}
		)



});

/*
Operação: Listar plantoes
Entidades: Opção de Escolha
Método: GET
Interface: /plantao

Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"100\", \"ordem\":\"asc\",\"campo\":\"codigo\"}" https://localhost:3000/plantoes

Saída: Um json com a listagem json com os dados dos plantões, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.

*/
app.get('/plantoes', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSON("plantao", "plantoes", ["codigo_escala", "codigo", "inicio", "fim", "n_magistrados"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/*
Operação: Incluir feriado
Entidades: Feriado, Estado,Cidade
Método: POST
Interface: /feriado
Entrada: Um json com o nome do feriado, o início, o fim e o tipo (“municipal”,”estadual” e “nacional”), cidade (preenchido com * se for estadual ou nacional), sigla_estado (preenchido com * se for nacional).
Exemplo de json de entrada: {"nome": "Dia da consciência negra", "inicio":"20/11/2023",  “fim”: “20/11/2023”,"tipo":"municipal","cidade":"Corumbá","estado":"MS"}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}
Exemplo curl: curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d {"nome": "Dia da consciência negra", "inicio":"20/11/2023",  “fim”: “20/11/2023”, "cidade":"Corumbá","sigla_estado":"MS"} https://localhost:3000/feriado
Funcionalidade associada: cadastro_feriado
Funcionamento: Simplesmente utilizada para cadastro de feriados municipais, estaduais e nacionais. Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_feriado” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_feriado” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro do feriado, uma mensagem de sucesso será enviada.
Obs:
(1)	Não pode existir dois feriados com mesmo nome e mesmas cidade e estado;
*/
app.post('/feriado', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theInicio = thebody.inicio;
	let theFim = thebody.fim;
	let theTipoFeriado = thebody.tipo;
	let theCidade = thebody.cidade;	
	let theSiglaEstado = thebody.sigla_estado; 

	//Corrigir datas!
	theFim = getDateFromBrazilianDate(theFim).toISOString();
	theInicio = getDateFromBrazilianDate(theInicio).toISOString();


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_feriado"
	verificaFuncionalidade(theUser, "cadastro_feriado", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se o feriado já foi cadastrado	
					let auxsql1 = 'nada'
					if (theTipoFeriado == 'municipal') {
						auxsql1 = ' select count(*) as theCount from feriado f, cidade c, estado e where ' +
							` f.codigo_estado = e.codigo and f.codigo_cidade = c.codigo and ` +
							` c.nome = '${theCidade}' and e.sigla='${theSiglaEstado}' and f.nome ='${theNome}' `
					}
					else if (theTipoFeriado == 'estadual') {
						auxsql1 = `select count(*) as theCount from feriado f, estado e where f.codigo_cidade is null and ` +
									` f.codigo_estado = e.codigo and e.sigla='${theSiglaEstado}' and f.nome ='${theNome}'`;
					}
					else if (theTipoFeriado == 'nacional') {
						auxsql1 = `select count(*) as theCount from feriado f where f.codigo_cidade is null and f.codigo_estado is null and f.nome ='${theNome}'`;
					}

					simpleResultSQL(auxsql1,[], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Agora vamos incluir!
								let auxsql2 = 'nada'
								if (theTipoFeriado == 'municipal') {
									auxsql2 = `insert into feriado(codigo_cidade,codigo_estado,nome,inicio,fim)` +
										` select c.codigo as codigo_cidade, e.codigo as codigo_estado, ? as nome, ? as inicio, ? as fim from` +
										` estado e, cidade c where e.sigla='${theSiglaEstado}' and e.codigo = c.codigo_estado and c.nome='${theCidade}'`
								}
								else if (theTipoFeriado == 'estadual') {
									auxsql2 = `insert into feriado(codigo_cidade,codigo_estado,nome,inicio,fim)` +
										` select null as codigo_cidade, e.codigo as codigo_estado, ? as nome, ? as inicio, ? as fim from` +
										` estado e where e.sigla='${theSiglaEstado}'`
								}
								else if (theTipoFeriado == 'nacional') {
									auxsql2 = `insert into feriado(codigo_cidade,codigo_estado,nome,inicio,fim)` +
										` values(null,null, ?,?,?)`
								}
								if (auxsql2 != "nada") {
									simpleExecSQL(auxsql2, [theNome, theInicio, theFim]).then
										(
											theresult => {
												if (theresult == true) {
													res.status(200).json({ 'mensagem': `O feriado "${theNome}" foi cadastrado com sucesso!` });
												}
												else {
													res.status(500).json({ 'mensagem': '3718:Erro no Banco de Dados!' });
												}
											},
											err3 => {
												res.status(200).json({ 'mensagem': '3722:Erro no Banco de Dados!' });
											}
										);
								}
								else {
									res.status(200).json({ 'mensagem': '3727:Erro no Banco de Dados!' });
								}
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O feriado ${theNome}! já tinha sido cadastrado!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '3754:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o feriado ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2860:mensagem': erro });
			}
		)


});

/*
Operação: Excluir feriado
Entidades: Feriado, Estado,Cidade
Método: DELETE
Interface: /feriado
Entrada: Um json com o nome do feriado, o tipo (“municipal”,”estadual” e “nacional”), a cidade (preenchido com * se for estadual ou nacional), e a sigla do estado (preenchido com * se for nacional).
Exemplo de json de entrada: {"nome": "Dia da consciência negra", "cidade":"Corumbá","sigla_estado":"MS"}
Headers: e-token no header “x-access-token”
Saída: Um json informando o sucesso ou fracasso da operação -> {“mensagem”:”Sucesso!”} ou {“mensagem”:”Ocorreu um erro...”}

Exemplo curl: 
curl -k -H "Content-Type: application/json" -H "x-access-token:%etokenD%" -X DELETE -d  "{\"nome\": \"Dia da consciencia negra\",\"tipo\":\"municipal\",\"cidade\":\"Corumba\",\"sigla_estado\":\"MS\"}" https://localhost:3000/feriado

Funcionalidade associada: exclusao_feriado
Funcionamento: Simplesmente utilizada para exclusao de feriados municipais, estaduais e nacionais. Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “exclusao_feriado” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “exclusao_feriado” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão do feriado, uma mensagem de sucesso será enviada.

*/
app.delete('/feriado', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theNome = thebody.nome;
	let theTipoFeriado = thebody.tipo;
	let theCidade = thebody.cidade;
	let theSiglaEstado = thebody.sigla_estado;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_feriado"
	verificaFuncionalidade(theUser, "cadastro_feriado", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se o feriado já foi cadastrado	
					let auxsql1 = 'nada'
					if (theTipoFeriado == 'municipal') {
						auxsql1 = ' select count(*) as theCount from feriado f, cidade c, estado e where ' +
							` f.codigo_estado = e.codigo and f.codigo_cidade = c.codigo and ` +
							` c.nome = '${theCidade}' and e.sigla='${theSiglaEstado}' and f.nome ='${theNome}' `
					}
					else if (theTipoFeriado == 'estadual') {
						auxsql1 = `select count(*) as theCount from feriado f, estado e where f.codigo_cidade is null and ` +
							` f.codigo_estado = e.codigo and e.sigla='${theSiglaEstado}' and f.nome ='${theNome}'`;
					}
					else if (theTipoFeriado == 'nacional') {
						auxsql1 = `select count(*) as theCount from feriado f where f.codigo_cidade is null and f.codigo_estado is null and f.nome ='${theNome}'`;
					}

					simpleResultSQL(auxsql1, [], "theCount").then(
						theCount => {
							if (theCount > 0) { //Podemos excluir!
								
								let auxsql2 = 'nada'
								if (theTipoFeriado == 'municipal') {
									auxsql2 = `delete from feriado where codigo_cidade in (select codigo as codigo_cidade from cidade c where c.nome='${theCidade}')` +
										` and codigo_estado in (select codigo as codigo_estado from estado e where e.sigla='${theSiglaEstado}')` +
										` and nome=?`;
								}
								else if (theTipoFeriado == 'estadual') {
									auxsql2 = `delete from feriado where codigo_cidade is null and ` +
										` codigo_estado in (select codigo as codigo_estado from estado e where e.sigla='${theSiglaEstado}')` +
										` and nome=?`;
								}
								else if (theTipoFeriado == 'nacional') {
									auxsql2 = `delete from feriado where codigo_cidade is null and codigo_estado is null and nome=?`;
								}
								if (auxsql2 != "nada") {
									simpleExecSQL(auxsql2, [theNome]).then
										(
											theresult => {
												if (theresult == true) {
													res.status(200).json({ 'mensagem': `O feriado "${theNome}" foi excluído com sucesso!` });
												}
												else {
													res.status(500).json({ 'mensagem': '3718:Erro no Banco de Dados!' });
												}
											},
											err3 => {
												res.status(200).json({ 'mensagem': '3722:Erro no Banco de Dados!' });
											}
										);
								}
								else {
									res.status(200).json({ 'mensagem': '3727:Erro no Banco de Dados!' });
								}
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O feriado ${theNome}! não existe!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '3754:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a excluir o feriado ${theNome}` });
				}
			},
			erro => {
				res.status(500).json({ '2860:mensagem': erro });
			}
		)


});

/*
Operação: Listar feriados
Entidades: Feriado
Método: GET
Interface: /feriados

Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”


Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"100\", \"ordem\":\"asc\",\"campo\":\"codigo\"}" https://localhost:3000/feriados

*/
app.get('/feriados', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSON("feriado", "feriados", ["codigo_cidade", "codigo_estado","codigo","nome", "inicio", "fim"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});


/*
Operação: Incluir Tipo Afastamento
Entidades: Tipo de Afastamento
Método: POST
Interface: /tipo_afastamento
Entrada: Um json o nome do afastamento. Exemplo: {"tipo_afastamento":"licença médica","descricao":"Periodo sem trabalhar em virtude de doença"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"tipo_afastamento\":\"licença médica\",\"descricao\":\"Período sem trabalhar em virtude de doença\"}" https://localhost:3000/tipo_afastamento


Funcionalidade associada: cadastro_tipo_afastamento

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_tipo_afastamento” 
em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_tipo_afastamento” 
tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro do tipo de afastamento, uma mensagem de sucesso será enviada.
*/
app.post('/tipo_afastamento', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theTipoAfastamento = thebody.tipo_afastamento;
	let theDescricao = thebody.descricao


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_tipo_afastamento"
	verificaFuncionalidade(theUser, "cadastro_tipo_afastamento", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se o afastamento já foi cadastrado já existe!																
					simpleResultSQL(`select count(*) as theCount from tipo_afastamento where nome=?`, [theTipoAfastamento], "theCount").then(
						theCount => {
							if (theCount == 0) { //Podemos incluir!
								//Agora vamos incluir!		
								simpleExecSQL(`insert into tipo_afastamento(nome,descricao) values (?,?)`, [theTipoAfastamento, theDescricao]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O tipo de afastamento "${theTipoAfastamento}" foi cadastrado com sucesso!` });
											}
											else {
												res.status(500).json({ 'mensagem': '3963:Erro no Banco de Dados!' });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '3967:Erro no Banco de Dados!' });
										}
									);
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O tipo de afastamento ${theTipoAfastamento}! já tinha sido cadastrado!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '3975:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar o tipo de afastamento ${theTipoAfastamento}` });
				}
			},
			erro => {
				res.status(500).json({ '3985:mensagem': erro });
			}
		)


});

/*
Operação: Excluir Tipo Afastamento
Entidades: Tipo de Afastamento
Método: DELETE
Interface: /tipo_afastamento
Entrada: Um json o nome do afastamento. Exemplo: {"tipo_afastamento":"licença médica"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"tipo_afastamento\":\"licença médica\"}" https://localhost:3000/tipo_afastamento

Funcionalidade associada: exclusao_tipo_afastamento

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade 
“exclusao_tipo_afastamento” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master 
ou sem a funcionalidade “exclusao_tipo_afastamento” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo na exclusão do tipo de afastamento,
uma mensagem de sucesso será enviada.

*/
app.delete('/tipo_afastamento', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	let thebody = req.body;
	let theTipoAfastamento = thebody.tipo_afastamento;
	


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "exclusao_tipo_afastamento"
	verificaFuncionalidade(theUser, "exclusao_tipo_afastamento", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se o afastamento já foi cadastrado já existe!																
					simpleResultSQL(`select count(*) as theCount from tipo_afastamento where nome=?`, [theTipoAfastamento], "theCount").then(
						theCount => {
							if (theCount > 0) { //Podemos excluir!
								//Agora vamos incluir!		
								simpleExecSQL(`delete from tipo_afastamento where nome=?`, [theTipoAfastamento]).then
									(
										theresult => {
											if (theresult == true) {
												res.status(200).json({ 'mensagem': `O tipo de afastamento "${theTipoAfastamento}" foi excluído com sucesso!` });
											}
											else {
												res.status(500).json({ 'mensagem': '4040:Erro no Banco de Dados!' });
											}
										},
										err3 => {
											res.status(200).json({ 'mensagem': '4044:Erro no Banco de Dados!' });
										}
									);
							}
							else { //Já incluído
								res.status(500).json({ 'mensagem': `O tipo de afastamento ${theTipoAfastamento}! não existe!` });
							}
						}, erroCount => {
							res.status(500).json({ 'mensagem': '4052:Erro no Banco de Dados!' });
						}
					)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a excluir o tipo de afastamento ${theTipoAfastamento}` });
				}
			},
			erro => {
				res.status(500).json({ '4062:mensagem': erro });
			}
		)


});

/*
Operação: Listar tipos de afastamento
Entidades: Tipo de afastamento
Método: GET
Interface: /tipos_afastamento

Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”


Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"100\", \"ordem\":\"asc\",\"campo\":\"codigo\"}" https://localhost:3000/tipos_afastamento


Saída: Um json com a listagem json com os dados dos tipos de afastamento, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.

*/
app.get('/tipos_afastamento', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSONFromSQL("select codigo,nome,descricao from tipo_afastamento ", "tiposAfastamento",
		["codigo", "nome", "descricao"], campo, inicio, fim, ordem,false).then
	//listSQLtoJSON("feriado", "feriados", ["codigo_cidade", "codigo_estado", "codigo", "nome", "inicio", "fim"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/* 
Operação: Incluir Vara Plantonista
Entidades: Vara Plantonista, Tipo de plantão
Método: POST
Interface: /vara_plantonista
Entrada: Um json com a “Sigla da Secretaria”, o “tipo de plantão”, o “início” e o “fim”
Exemplo: {"sigla_vara":"1VCRBA","tipo_plantao":"plantao regional","inicio":"01/03/2023","fim":"31/03/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"sigla_vara\":\"1VCRBA\",\"tipo_plantao\":\"plantao regional\",\"inicio\":\"01/03/2023\",\"fim\":\"31/03/2023\"}" https://localhost:3000/vara_plantonista

Funcionalidade associada: cadastro_vara_plantonista

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “cadastro_vara_plantonista” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “cadastro_vara_plantonista” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro de uma vara plantonista, uma mensagem de sucesso será enviada.

*/
app.post('/vara_plantonista', jsonParser, function (req, res) {
	let thebody = req.body;
	let theSiglaVara = thebody.sigla_vara;
	let theTipoPlantao = thebody.tipo_plantao;
	let theInicio = thebody.inicio;
	let theFim = thebody.fim;


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_vara_plantonista"

	verificaFuncionalidade(theUser, "cadastro_vara_plantonista", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se a vara plantonista já está cadastrada, isto é, se existe uma vara plantonista com o mesmo tipo de plantão no mesmo período													
					simpleResultSQL(`select count(*) as theCount from vara_plantonista vp, tipo_plantao tp, secretaria s ` +
						`  where vp.codigo_secretaria = s.codigo and vp.codigo_tipo_plantao=tp.codigo ` +
						` and s.sigla = ? and tp.nome = ? and vp.inicio=? and vp.fim=?`, [theSiglaVara, theTipoPlantao, theInicio,theFim], "theCount").then(
							theCount => {
								if (theCount == 0) { //Podemos incluir!
									//Vamos verificar se existe a secretaria e a escala de plantao!
									simpleResultSQL(`select count(*) as theCount from tipo_plantao tp, secretaria s where s.sigla=? and tp.nome=?`,
										[theSiglaVara, theTipoPlantao], "theCount").then(
											theCount2 => {
												if (theCount2 > 0) {
													//Podemos	
													simpleExecSQL(`insert into vara_plantonista(codigo_secretaria,codigo_tipo_plantao,inicio,fim)` +
														` select distinct s.codigo as codigo_secretaria,tp.codigo as codigo_tipo_plantao, ? as inicio, ? as fim ` +
														` from secretaria s, tipo_plantao tp where s.sigla=? and tp.nome=?`,
														[theInicio, theFim,theSiglaVara, theTipoPlantao]).then
														(
															theresult => {
																if (theresult == true) {
																	res.status(200).json({ 'mensagem': `A vara plantonista foi cadastrada com sucesso!` });
																}
																else {
																	res.status(500).json({ 'mensagem': '4220:Erro no Banco de Dados!' });
																}
															},
															err3 => {
																res.status(200).json({ 'mensagem': '4224:Erro no Banco de Dados!' });
															}
														);
												}
												else {
													res.status(500).json({ 'mensagem': `O tipo de plantao ${theTipoPlantao} ou secretaria ${theSiglaVara} não existem!` });
												}
											},
											erro2 => {
												res.status(500).json({ 'mensagem': '4233:Erro no Banco de Dados!' });
											}
										)
								}
								else { //Já incluído
									res.status(500).json({ 'mensagem': `A vara plantonista já tinha sido cadastrada!` });
								}
							}, erroCount => {
								res.status(500).json({ 'mensagem': '4241:Erro no Banco de Dados!' });
							}
						)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar varas plantonistas!` });
				}
			},
			erro => {
				res.status(500).json({ '4251:mensagem': erro });
			}
		)





});


/* 
Operação:  Excluir Vara Plantonista
Entidades: Vara Plantonista, Tipo de plantão
Método: DELETE
Interface: /vara_plantonista
Entrada: Um json com a “Sigla da Secretaria”, o “tipo de plantão”, o “início” e o “fim”
Exemplo: {"sigla_vara":"1VCRBA","tipo_plantao":"plantao regional","inicio":"01/03/2023","fim":"31/03/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d "{\"sigla_vara\":\"1VCRBA\",\"tipo_plantao\":\"plantao regional\",\"inicio\":\"01/03/2023\",\"fim\":\"31/03/2023\"}" https://localhost:3000/vara_plantonista

Funcionalidade associada: exclusao_vara_plantonista

Funcionamento: Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “exclusao_vara_plantonista” em seu perfil de acessos. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “exclusao_vara_plantonista” tenta utilizar a operação, uma mensagem de erro ocorrerá. Se tudo der certo no cadastro de uma vara plantonista, uma mensagem de sucesso será enviada.

*/

app.delete('/vara_plantonista', jsonParser, function (req, res) {
	let thebody = req.body;
	let theSiglaVara = thebody.sigla_vara;
	let theTipoPlantao = thebody.tipo_plantao;
	let theInicio = thebody.inicio;
	let theFim = thebody.fim;

	//Corrigir datas!
	theFim = getDateFromBrazilianDate(theFim).toISOString();
	theInicio = getDateFromBrazilianDate(theInicio).toISOString();


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "cadastro_vara_plantonista"

	verificaFuncionalidade(theUser, "exclusao_vara_plantonista", undefined).then
		(
			passou => {
				if (passou == true) {
					//Vamos verificar se a vara plantonista já está cadastrada, isto é, se existe uma vara plantonista com o mesmo tipo de plantão no mesmo período													
					simpleResultSQL(`select count(*) as theCount from vara_plantonista vp, tipo_plantao tp, secretaria s ` +
						`  where vp.codigo_secretaria = s.codigo and vp.codigo_tipo_plantao=tp.codigo ` +
						` and s.sigla = ? and tp.nome = ? and vp.inicio=? and vp.fim=?`, [theSiglaVara, theTipoPlantao, theInicio, theFim], "theCount").then(
							theCount => {
								if (theCount > 0) { //Podemos excluir!
									//Podemos	
									simpleExecSQL(`delete from vara_plantonista where ` +
										` codigo_secretaria in (select distinct s.codigo as codigo_secretaria from secretaria s where s.sigla=?) and ` +
										` codigo_tipo_plantao in (select tp.codigo as codigo_tipo_plantao from tipo_plantao tp where tp.nome=?) and ` +
										` inicio =? and fim=?`,
										[theSiglaVara, theTipoPlantao, theInicio, theFim]).then
										(
											theresult => {
												if (theresult == true) {
													res.status(200).json({ 'mensagem': `A vara plantonista foi removida com sucesso!` });
												}
												else {
													res.status(500).json({ 'mensagem': '4316:Erro no Banco de Dados!' });
												}
											},
											err3 => {
												res.status(200).json({ 'mensagem': '4320:Erro no Banco de Dados!' });
											}
									);

								}
								else { //Já incluído
									res.status(500).json({ 'mensagem': `A vara plantonista não existe!` });
								}
							}, erroCount => {
								res.status(500).json({ 'mensagem': '4329:Erro no Banco de Dados!' });
							}
						)

				}
				else {
					res.status(500).json({ 'mensagem': `Usuário não autorizado a cadastrar varas plantonistas!` });
				}
			},
			erro => {
				res.status(500).json({ '4339:mensagem': erro });
			}
		)





});


/* 
Operação: Listar varas_plantonistas
Entidades: Tipo de afastamento
Método: GET
Interface: /varas_plantonistas

Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”


Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"100\", \"ordem\":\"asc\",\"campo\":\"codigo\"}" https://localhost:3000/varas_plantonistas

Saída: Um json com a listagem json com os dados das varas plantonistas, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.

*/
app.get('/varas_plantonistas', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	listSQLtoJSONFromSQL("select * from (select s.nome as secretaria,s.nome as tipo_plantao, vp.codigo as codigo,vp.inicio as inicio,vp.fim as fim from vara_plantonista vp" +
				  		 ", tipo_plantao tp, secretaria s " +
						 " where vp.codigo_secretaria =s.codigo and vp.codigo_tipo_plantao = tp.codigo) ", "varasPlantonistas",
		["secretaria", "tipo_plantao", "codigo","inicio","fim"], campo, inicio, fim, ordem,false).then
		//listSQLtoJSON("feriado", "feriados", ["codigo_cidade", "codigo_estado", "codigo", "nome", "inicio", "fim"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});

/* 
Operação: Iniciar período de escolha de plantões
Entidades: Escala de Plantão, Opção de Escolha
Método: POST
Interface: /iniciar_periodo_escolha
Entrada: Um json com o nome da escala de plantão
Exemplo: {"escala_plantao":" plantão regional fev/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"escala_plantao\":\"plantao regional abr/2023\"}" https://localhost:3000/iniciar_periodo_escolha

Funcionalidade associada: iniciar_periodo_escolha

Funcionamento: Neste caso, ocorre a alteração do campo fase da entidade “Escala de Plantão” para “escolha ordenada”.  Em suma, o administrador da escala decide liberar a escala para que os magistrados façam a escolha dos seus plantões. 

Tal método somente pode ser utilizado pelo administrador do sistema (perfil master) e por todos os usuários que possuam a funcionalidade “iniciar_periodo_escolha” em seu perfil de acessos para a regional informada. O login do usuário que acionou o serviço já é fornecido no e-token. Se um usuário sem o perfil master ou sem a funcionalidade “iniciar_periodo_escolha” tenta utilizar a operação, uma mensagem de erro ocorrerá. 

Se tudo der certo, a operação vai colocar a escala de plantão na fase “escolha ordenada”, o que possibilitará o início de escolha de plantões pelos magistrados. Além disso, o juiz maior antiguidade (isto é, valor de antiguidade menor...), que possua opções de escolha ativas, isto é, sua opção de escolha não está com a informação “se_finalizado==true” será o juiz ativo para escolha. Em outras palavras o juiz com mais antigo que não escolheu terá seu rf incluído no campo “rf_juiz_ativo_para_escolha”. Resumindo, o juiz mais antigo que tenha opção de escolha cadastrada para o plantão poderá escolher primeiro.

Em relação aos prazos de escolha cadastrados, quando o período de escolha é iniciado para uma escala, a informação “inicio_prazo” em “opcao_escolha” para o “juiz_ativo_para_escolha” deve ficar com o mesmo dia da ativação da escolha.

Quando as escolhas do magistrado são finalizadas, automaticamente é escolhido o próximo juiz mais antigo com opções de escolha cadastradas para o plantão.

Observações:

(1)	Se não há juízes com opções de escolha cadastradas para a escala de plantão, não pode também ser ativado o período de escolha e deve ser retornada uma mensagem “Não há opções de escolha cadastradas que possam ser alocadas a todos os plantões cadastrados”!
(2)	Se não há plantões cadastrados para cobrindo todo o período da escala de plantão, também não pode ser ativado o período de escolha, e deve ser exibida uma mensagem “Não há plantões suficientes cobrindo todo o período”!
*/

app.post('/iniciar_periodo_escolha', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let escalaPlantao = thebody.escala_plantao;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Pegando as regionais associadas à escala de plantão
	simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
		` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
		`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
		`  where ep.nome = ?))`, [escalaPlantao], 'regional').then
		(
			theRegionais => {
				//Chamar rotina que valida se é master ou se o usuário possui direito de usar a funcionalidade "exclusao_plantao" para as regionais
				// associadas à escala de plantão informada
				verificaFuncionalidade(theUser, "iniciar_periodo_escolha", theRegionais).then
					(
						passou => {
							if (passou == true) {

								//Vamos verificar se há plantões cadastrados cobrindo o período da escala de plantão.
								//	Como os plantões não se cruzam, basta somar a quantidade de dias para cada plantão								
								simpleResultSQL(`select COUNT(*) as theCount from plantao p, escala_plantao ep where p.codigo_escala = ep.codigo and ep.nome=?`,
									[escalaPlantao], "theCount").then(
									dias => {
										if (dias > 0) {
											//Vamos verificar se há magistrados cadastrados, isto é, com opções de escolha não finalizadas para esta escala de plantão
											simpleResultSQL(`select COUNT(*) as theCount from opcao_escolha oe, escala_plantao ep where oe.se_finalizado=0 and ` +
												` oe.codigo_escala = ep.codigo and ep.nome=?`, [escalaPlantao], "theCount").then(
													nops => {
														if (nops > 0) {
															// A escala já está iniciada ?
															simpleResultSQL(`select COUNT(*) as theCount from escala_plantao ep where ep.nome=? and fase='escolha ordenada'`,
																[escalaPlantao], "theCount").then
															(
																jainiciada => {
																	if (jainiciada > 0) {
																		res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" já tinha sido iniciada para escolha!` });
																	}
																	else {//vamos lá
																		//Ok. Agora podemos colocar a escala de plantão na fase "escolha ordenada"
																		simpleExecSQL(`update escala_plantao set fase='escolha ordenada' where nome=?`, [escalaPlantao]).then
																			(
																				theresult => {
																					if (theresult == true) {
																						res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" foi iniciada para escolha!` });
																					}
																					else {
																						res.status(500).json({ 'mensagem': '4080:Erro no Banco de Dados!' });
																					}
																				},
																				err3 => {
																					res.status(200).json({ 'mensagem': '4084:Erro no Banco de Dados!' });
																				}
																			);
																	}
																}, err3 => {
																	res.status(200).json({ 'mensagem': '4089:Erro no Banco de Dados!' });
																}
															)

															
														}
														else {
															res.status(500).json({ 'mensagem': `Não há opções de escolha cadastradas para magistrados nessa escala de plantão` });
														}
													}, err2 => {
														res.status(500).json({ 'mensagem': `4460:Erro de Banco de dados!` });
													}
											);

											

											
										}
										else {
											res.status(500).json({ 'mensagem': `Não há plantões cadastrados para esta escala!` });
										}
									}, err1 => {
										res.status(500).json({ 'mensagem': `4471:Erro de Banco de dados!` });
									}
								);
							}
							else {
								res.status(500).json({ 'mensagem': `Usuário não autorizado a iniciar o período de escolha do plantão!` });
							}
						},
						erro => {
							res.status(500).json({ 'mensagem': '4506:'+erro });
						}
					)


			},
			erro1 => {
				res.status(500).json({ 'mensagem': '4508:Erro no Banco de Dados!' });
			}
		)

	

});

/* 
Operação: Escolha de Plantão por magistrado
Entidades: Escala de Plantão, Opção de Escolha, Juiz, Plantão
Método: POST
Interface: /escolha_plantao
Entrada: Um json com o “rf do juiz”, o nome da escala de plantão, o “inicio” e o “fim” do plantão.
Exemplo: {“rf_juiz”:”12345”, "escala_plantao":" plantão regional fev/2023", “01/02/2023”,”10/02/2023”}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST  -d "{\"rf_juiz\":\"382\", \"escala_plantao\":\"plantao regional abr/2023\", \"inicio\":\"01/01/2023\",\"fim\":\"10/01/2023\"}" https://localhost:3000/escolha_plantao

Funcionalidade associada: escolha_plantao

Funcionamento: O magistrado, quando for o juiz ativo para escolha (“Escala de Plantão”.rf_juiz_ativo_para_escolha), informa um plantão “livre” que deseja atuar. 
Entenda-se por plantão livre o plantão ao qual não tem nenhum juiz associado ou, não tenha o número de magistrados necessários ao plantão preenchidos. Nesse caso, 
ao acionar a operação via webapi, são informados os dados do magistrado e os dados do plantão escolhido. A tabela “escolha_plantao” guarda a associação entre a 
tabela “plantao” e a tabela “juiz”. Um plantão é considerado “livre” se o número de associações é inferior ao número armazenado no campo “n_magistrados”.

A operação em questão pode ser usada pelo administrador do sistema (perfil master), por magistrados que estejam ativos para escolha 
(“escala_plantao”.rf_juiz_ativo_para_escolha), e por usuários que possuam a funcionalidade “escolha_plantao” no seu perfil para a regional.

No caso de magistrados, como o usuário do serviço já é fornecido pelo e-token, pode-se deduzir que o usuário é magistrado se o e-mail do usuário 
for igual ao e-mail do juiz cujo rf foi informado.

Se houver permissão para realizar a operação e houver escolhas livres disponíveis é feito a associação na tabela “escolha_plantao”.


Observações:

*/
app.post('/escolha_plantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let rf_juiz = thebody.rf_juiz;
	let escalaPlantao = thebody.escala_plantao;
	let inicio = thebody.inicio;
	let fim = thebody.fim;

	//Corrigir datas!
	inicio = getDateFromBrazilianDate(inicio).toISOString();
	fim = getDateFromBrazilianDate(fim).toISOString();


	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	const auxfunc = async () => {
		let isJuizAtivoParaEscolha = false;		
		let fase = await simpleResultSQL(`select fase from escala_plantao where nome =?`, [escalaPlantao], 'fase');
		let isJuiz = (await simpleResultSQL(`select count(*) as theCount from juiz where email =?`, [theUser], 'theCount')) > 0 ? true : false;

		if (fase === undefined || fase == null) {
			res.status(500).json({ 'mensagem': `A escala de plantão não existe!` });
		}
		else {
			let count1 = await simpleResultSQL(`select count(*) as theCount from juiz j, escala_plantao ep where j.rf=? and j.rf=rf_juiz_ativo_para_escolha and ep.nome =?`,
				[rf_juiz, escalaPlantao], 'theCount');
			if (count1 == 1) {
				isJuizAtivoParaEscolha = true;
			}
			let isUsuarioJuizAtivoEscolha = await simpleResultSQL(`select count(*) as theCount from juiz where email=? and rf=?`, [theUser, rf_juiz], 'theCount');
			let theRegionais = await simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
				` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
				`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
				`  where ep.nome = ?))`, [escalaPlantao], 'regional');
			let passou = verificaFuncionalidade(theUser, "escolha_plantao", theRegionais);
			if (passou == false && isJuizAtivoParaEscolha == false) {
				res.status(500).json({ 'mensagem': `Usuário não autorizado a registrar a escolha do plantão!` });
			}		
			else if (passou == false && isUsuarioJuizAtivoEscolha == false && fase != 'escolha livre') {
				res.status(500).json({ 'mensagem': `O magistrado não está em sua vez de escolha!` });
			}
			else if (fase == 'escolha_livre' && isJuiz == false) {
				res.status(500).json({ 'mensagem': `Usuário não autorizado a registrar a escolha do plantão!` });
			}			
			else {

				/*
				sqlite > select substr('2023-05-02T22:01:08.082Z', 1, 4);
				substr('2023-05-02T22:01:08.082Z', 1, 4)
				2023
				sqlite > select substr('2023-05-02T22:01:08.082Z', 6, 2);
				substr('2023-05-02T22:01:08.082Z', 6, 2)
				05
				sqlite > select substr('2023-05-02T22:01:08.082Z', 9, 2);
				substr('2023-05-02T22:01:08.082Z', 9, 2)
				02
				*/

				let auxYearInicio = inicio.substr(0, 4);
				let auxMonthInicio = inicio.substr(5, 2);
				let auxDayInicio = inicio.substr(8, 2)
				let auxYearFim = fim.substr(0, 4);
				let auxMontFim = fim.substr(5, 2);
				let auxDayFim = fim.substr(8, 2)



				//Vamos pegar o codigo_plantao e n_magistrados.
				let auxArray = await multipleResultSQL(`select p.codigo as codigo_plantao, p.n_magistrados as n_magistrados, ep.fase as fase ` +
					` from  plantao p, escala_plantao ep where p.codigo_escala = ep.codigo and ` +
					` ep.nome=? and substr(p.inicio,1,4)=? and ` + //ano do inicio
					` substr(p.inicio,6,2)=? and ` + //mês do inicio
					` substr(p.inicio,9,2)=? and ` + //dia do inicio
					` substr(p.fim, 1, 4) =? and ` + //ano do fim
					` substr(p.fim, 6, 2) =? and ` + //mês do fim
					` substr(p.fim, 9, 2) =? `  //dia do fim
					, [escalaPlantao, auxYearInicio, auxMonthInicio, auxDayInicio, auxYearFim, auxMontFim, auxDayFim],
					['codigo_plantao', 'n_magistrados', 'fase']);

				if (auxArray === undefined) {
					res.status(500).json({ 'mensagem': `4740:Erro de Banco de dados!` });
				}
				else {
					let codigo_plantao = auxArray[0];
					let n_magistrados = auxArray[1];
					let fase_escala = auxArray[2];
					if (fase_escala != 'escolha ordenada') {
						res.status(500).json({ 'mensagem': `A escala de plantão não está liberada para escolha!` });
					}
					else {
						//Será que a associação já foi realizada?
						let count2 = await simpleResultSQL(`select COUNT(*) as theCount from  escolha_plantao where codigo_plantao = ? and rf_juiz = ?`,
							[codigo_plantao, rf_juiz], "theCount");

						if (count2 > 0) {
							res.status(500).json({ 'mensagem': `A escolha já tinha sido registrada!` });
						}
						else {
							//Tenho que verificar se já ainda há vagas para o magistrado no plantao escolhido
							let escolhidos = await simpleResultSQL(` select COUNT(*) as theCount from  escolha_plantao ep where codigo_plantao = ? `,
								[codigo_plantao], "theCount");

							if (escolhidos < n_magistrados) {
								//Agora posso registrar! ufa!
								let theresult = await simpleExecSQL(`insert into escolha_plantao(codigo_plantao,rf_juiz) VALUES (?,?)`,
									[codigo_plantao, rf_juiz]);
								if (theresult == true) {
									res.status(200).json({ 'mensagem': `O plantao foi escolhido com sucesso!` });
								}
								else {
									res.status(500).json({ 'mensagem': '4770:Erro no Banco de Dados!' });
								}
							}
							else {
								res.status(500).json({ 'mensagem': `Não há vagas para o plantão escolhido!` });
							}
						}
					}
				}
			}
		}
	}

	try {
		auxfunc();
	}
	catch (err) {
		res.status(500).json({ 'mensagem': `4693:Erro de Banco de Dados!` });
	}
	




});



/*
Operação: Alteração das escolhas de plantão de um do juiz pelo administrador da escala
Entidades: Escala de Plantão, Opção de Escolha, Juiz, Plantão
Método: PUT
Interface: /escolha_plantao
Entrada: Um json com o rf do juiz, rf do juiz anterior, nome da escala de plantão e data de início e fim do plantão
Exemplo: {“rf_juiz”:”11245”, “rf_juiz_anterior”:”11246”, "escala_plantao":" plantão regional fev/2023", “01/02/2023”,”10/02/2023”}

Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 
curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT  -d "{\"rf_juiz\":\"11246\",\"rf_juiz_anterior\":\"11245\", \"escala_plantao\":\"plantao regional maio/2023\", \"inicio\":\"01/05/2023\",\"fim\":\"02/05/2023\"}" https://localhost:3000/escolha_plantao


Funcionalidade associada: fechar_periodo_escolha_magistrado

Funcionamento: O objetivo aqui é propiciar que trocas manuais, verbais, sejam registradas pelo administrador da escala. O administrador da escala poderá também alterar as escolhas feitas pelos magistrados. Isso é comum para resolver conflitos e eventos inesperados tais como “designações” e “licenças médicas”. O pré-requisito é que as escolhas de plantões estejam registradas no sistema. 

*/
app.put('/escolha_plantao', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let rf_juiz = thebody.rf_juiz;
	let rf_juiz_anterior = thebody.rf_juiz_anterior;
	let escalaPlantao = thebody.escala_plantao;
	let inicio = thebody.inicio;
	let fim = thebody.fim;

	//Corrigir datas!
	inicio = getDateFromBrazilianDate(inicio).toISOString();
	fim = getDateFromBrazilianDate(fim).toISOString();


	//Quem é o usuário?	
	let theUser = req.session.myToKen.user
	let Regionais = null;
	//Agora vamos avaliar se há permissão
	try {
		const auxFunc = async () => {
			let theRegionais = await simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
				` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
				`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
				`  where ep.nome = ?))`, [escalaPlantao], 'regional');
			let passou = await verificaFuncionalidade(theUser, "alterar_escolha_plantao", theRegionais);

			if (passou == false) {
				res.status(500).json({ 'mensagem': 'Usuário não autorizado a alterar escolhas de plantão!' });
			}
			else {
				//Será que existe alguma a escolha de plantão descrita ?
				//Vamos pegar o codigo_plantao e n_magistrados.
				let auxYearInicio = inicio.substr(0, 4);
				let auxMonthInicio = inicio.substr(5, 2);
				let auxDayInicio = inicio.substr(8, 2)
				let auxYearFim = fim.substr(0, 4);
				let auxMontFim = fim.substr(5, 2);
				let auxDayFim = fim.substr(8, 2);
				let cod_plantao = await simpleResultSQL(`select p.codigo as codigo_plantao ` +
					` from  plantao p, escala_plantao ep, escolha_plantao esp where p.codigo_escala = ep.codigo and ` +
					` ep.nome=? and substr(p.inicio,1,4)=? and ` + //ano do inicio
					` substr(p.inicio,6,2)=? and ` + //mês do inicio
					` substr(p.inicio,9,2)=? and ` + //dia do inicio
					` substr(p.fim, 1, 4) =? and ` + //ano do fim
					` substr(p.fim, 6, 2) =? and ` + //mês do fim
					` substr(p.fim, 9, 2) =? and ` + //dia do fim
					` esp.codigo_plantao = p.codigo and esp.rf_juiz = ? `
					, [escalaPlantao, auxYearInicio, auxMonthInicio, auxDayInicio, auxYearFim, auxMontFim, auxDayFim, rf_juiz_anterior], 'codigo_plantao');

				if (cod_plantao === undefined) {
					res.status(500).json({ 'mensagem': 'A escolha de plantão solicitada não existe!' });
				}
				else {
					//Agora vamos fazer o update
					theresult = await simpleExecSQL(`update escolha_plantao set rf_juiz =? where codigo_plantao =? and rf_juiz=?`,
						[rf_juiz, cod_plantao, rf_juiz_anterior]);
					if (theresult == true) {
						res.status(200).json({ 'mensagem': `As opções de escolha do magistrado foram alteradas com sucesso!` });
					}
				}
			}
		}
		auxFunc();
	}
	catch (err) {
		res.status(500).json({ 'mensagem': err });
	}

});



/* 
Operação: Passar a vez (Fechar período de escolha de juiz, sem nenhuma escolha)
Entidades: Escala de Plantão, Opção de Escolha, Juiz, Plantão
Método: POST
Interface: /fechar_periodo_escolha_magistrado
Entrada: Um json com o nome da escala de plantão.
Exemplo: {“rf_juiz”:”12345”, "escala_plantao":" plantão regional fev/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 
curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"escala_plantao\":\"plantao regional abr/2023\"}" https://localhost:3000/fechar_periodo_escolha_magistrado



Funcionalidade associada: fechar_periodo_escolha_magistrado

Funcionamento: 
	Nesse caso, o magistrado “passa a vez” para o próximo juiz ativo para escolha. O sistema simplesmente coloca marcado “se_finalizado==true” 
em sua opção de escolha para o plantão.
	A operação em questão pode ser usada pelo administrador do sistema (perfil master), por magistrados que estejam ativos para escolha 
(“escala_plantao”.rf_juiz_ativo_para_escolha), e por usuários que possuam a funcionalidade “fechar_periodo_escolha_magistrado” no seu perfil para a regional. 
No caso de magistrados, como o usuário do serviço já é fornecido pelo e-token, pode-se deduzir que o usuário é magistrado se o e-mail do usuário for igual ao 
e-mail do juiz cujo rf foi informado.
	Se houver permissão para realizar a operação, o sistema “fecha” a opção de escolha para o juiz, simplesmente colocando “se_finalizado==true” em sua opção
de escolha para o plantão.
*/

app.post('/fechar_periodo_escolha_magistrado', jsonParser, function (req, res) {
	var thebody = req.body;
	let rf_juiz = thebody.rf_juiz;
	let escalaPlantao = thebody.escala_plantao;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user


	//É juiz ?
	simpleResultSQL(`select count(*) as theCount from juiz j, escala_plantao ep where j.rf=? and j.rf=rf_juiz_ativo_para_escolha and ep.nome =?`,
		[rf_juiz, escalaPlantao], 'theCount').then(
			count1 => {
				let isJuizAtivoParaEscolha = false;
				if (count1 == 1) {
					//É Juiz ativo para escolha
					isJuizAtivoParaEscolha = true;
				}
				//Agora vamos avaliar se há permissão
				simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
					` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
					`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
					`  where ep.nome = ?))`, [escalaPlantao], 'regional').then
					(
						theRegionais => {
							verificaFuncionalidade(theUser, "fechar_periodo_escolha_magistrado", theRegionais).then(
								passou => {
									if (passou == false && isJuizAtivoParaEscolha == false) {
										res.status(500).json({ 'mensagem': `Usuário não autorizado a fechar escolhas de plantão do magistrado!` });
									}
									else {
										//Vamos verificar se há opções de escolha para o magistrado!
										simpleResultSQL(`select count(*) as theCount from opcao_escolha oe, escala_plantao ep where ep.nome=? ` +
											` and oe.codigo_escala = ep.codigo and oe.rf_juiz=? and se_finalizado=0`, [escalaPlantao, rf_juiz], "theCount").then
											(
												count2 => {
													if (count2 > 0) {
														//vamos agora fechar as opções de escolha
														simpleExecSQL(`update opcao_escolha set se_finalizado=1 where ` +
															` codigo_escala in (select distinct ep.codigo as codigo_escala from escala_plantao ep where ep.nome=?) and ` +
															` rf_juiz=?`, [escalaPlantao, rf_juiz]).then
															(

																theresult => {
																	if (theresult == true) {
																		res.status(200).json({ 'mensagem': `As opções de escolha do magistrado foram fechadas com sucesso!` });
																	}
																},
																err4 => {
																	res.status(200).json({ 'mensagem': '4807:Erro no Banco de Dados!' });
																}

															);
													}
													else {
														res.status(500).json({ 'mensagem': `Não existem opções de escolha abertas cadastradas para o magistrado!` });
													}
												},
												err3 => {
													res.status(500).json({ 'mensagem': `4797:Erro de Banco de dados!` });
												}
											);

									}
								},
								err2 => {
									res.status(500).json({ 'mensagem': `4804:Erro de Banco de dados!` });
								}
							);
						},
						erroRg => {
							res.status(500).json({ 'mensagem': `4809:Erro de Banco de dados!` });
						}
					);



			},
			errCount1 => {
				res.status(500).json({ 'mensagem': `4685:Erro de Banco de dados!` });
			}
		);
});

/* 
Operação: calcular juiz ativo para escolha
Entidades: Escala de Plantão, Opção de Escolha, Juiz, Plantão
Método: GET
Interface: /calcular_juiz_ativo_escolha
Entrada: Um json com o nome da escala de plantão.
Exemplo: {"escala_plantao":" plantão regional fev/2023","data_referencia":"12/04/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o rf do juiz ativo para escolha -> {"rf_juiz”:"382"} ou {"rf_juiz”:null}

Exemplo curl: 
curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"escala_plantao\":\"plantao regional abr/2023\", \"data_referencia\":\"12/04/2023\"}" https://localhost:3000/calcular_juiz_ativo_escolha

Funcionalidade associada: calcular_juiz_ativo_escolha

Funcionamento: Nas situações em que o magistrado já escolheu seus plantões (ou informou que não escolheria), bem como nas situações em que o prazo expirou para o 
“juiz_ativo_para_escolha”, o sistema irá mudar o juiz ativo para escolha através desta rotina. A mudança é simples. Basta selecionar o juiz com maior antiguidade 
(menor valor de antiguidade) que tem data de início de seu período de escolha mais perto da data atual. Se há dois juízes com o mesmo dia de início de escolha, 
leva vantagem quem tem a maior antiguidade.
Considera-se “fechada” a escolha do juiz se o seu “prazo de escolha” passou, ou se está marcado “se_finalizado==true” em sua opção de escolha para o plantão.
Considera-se “aberta” a escolha do juiz, se o seu “prazo de escolha” ainda não expirou e não está marcado “se_finalizado==true” em sua opção de escolha para o plantão.
Na ocasião de calcular o juiz ativo para escolha, seleciona-se o juiz com “escolha aberta” que tem o “prazo de escolha” mais próximo da data atual. Se a proximidade 
do prazo de escolha é igual para dois ou mais magistrados, seleciona-se o que possuir maior antiguidade.

A operação em questão pode ser usada pelo administrador do sistema (perfil master), por magistrados que estejam ativos para escolha 
(“escala_plantao”.rf_juiz_ativo_para_escolha), e por usuários que possuam a funcionalidade “calcular_juiz_ativo_escolha” no seu perfil para a regional. No caso de 
magistrados, como o usuário do serviço já é fornecido pelo e-token, pode-se deduzir que o usuário é magistrado se o e-mail do usuário for igual ao e-mail do juiz 
cujo rf foi informado.

Se houver permissão para realizar a operação, o próximo juiz ativo para escolha é selecionado.

*/
app.get('/calcular_juiz_ativo_escolha', jsonParser, function (req, res) {
	var thebody = req.body;	
	let escalaPlantao = thebody.escala_plantao;
	let auxData1 = thebody.data_referencia;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user

	//Qual a data de hoje?
	//let auxData = getBrazilianDate(new Date());
	auxData = getDateFromBrazilianDate(auxData1).toISOString();





	
	//A escala de plantão informada existe?
	multipleResultSQL(`select codigo,rf_juiz_ativo_para_escolha from escala_plantao ep where ep.nome =?`, [escalaPlantao], ['codigo','rf_juiz_ativo_para_escolha']).then(
		auxArray => {
			if (auxArray.length == 0) {
				res.status(500).json({ 'mensagem': `A escala de plantão informada não existe!` });
			}
			else {
				//Qual o juiz ativo para escolha atual e o código do plantao?
				let codigo_escala = auxArray[0];
				let rf_juiz_ativo_para_escolha = auxArray[1];

				//É o juiz ativo para escolha quem está acionando a rotina?
				//É juiz ?
				simpleResultSQL(`select count(*) as theCount from juiz j where j.email=? and j.rf=?`, [theUser, rf_juiz_ativo_para_escolha],'theCount').then(
						count1 => {
							let isJuizAtivoParaEscolha = false;
							if (count1 == 1 && rf_juiz_ativo_para_escolha !== undefined) {
								//É Juiz ativo para escolha
								isJuizAtivoParaEscolha = true;
							}
							//Agora vamos avaliar se há permissão
							simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
								` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
								`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
								`  where ep.nome = ?))`, [escalaPlantao], 'regional').then
								(
									theRegionais => {
										verificaFuncionalidade(theUser, "calcular_juiz_ativo_escolha", theRegionais).then(
											passou => {
												if (passou == false && isJuizAtivoParaEscolha == false) {
													res.status(500).json({ 'mensagem': `Usuário não autorizado a calcular o próximo juiz ativo para escolha!` });
												}
												else {//Temos que verificar se o juiz atual já fechou sua escala:
													let escolha_fechada = false;
													//Quantos plantões o juiz já escolheu?
													simpleResultSQL(` select count(*) as theCount from plantao p, escala_plantao ep, escolha_plantao esp, juiz j ` +
														` where p.codigo_escala = ep.codigo and esp.codigo_plantao=p.codigo and ` +
														` esp.rf_juiz =j.rf and j.rf=? and ep.codigo=?`
														, [rf_juiz_ativo_para_escolha, codigo_escala],
														'theCount').then
														(
															n_escolhas => {
																//A opcao de escolha do juiz atual já foi finalizada?
																//O prazo de escolha do juiz já se encerrou?
																simpleResultSQL(` select distinct count(*) as theCount from opcao_escolha where codigo_escala=? and rf_juiz=? ` +
																	` and ((fim_prazo < ?) or (se_finalizado = 1) or (n_escolhas=?))`,
																	[codigo_escala, rf_juiz_ativo_para_escolha, auxData, n_escolhas],
																	'theCount').then
																	(
																		fechada => {
																			if ((fechada > 0) || (rf_juiz_ativo_para_escolha === undefined) || (rf_juiz_ativo_para_escolha == null) ) {
																				//Podemos fechar a opcao de escolha, ou a opcao de escolha já está fechada!
																				simpleExecSQL(` update opcao_escolha set se_finalizado=1 where codigo_escala=? and rf_juiz =?`
																					, [codigo_escala, rf_juiz_ativo_para_escolha]).then
																					(

																						theresult => {
																							if (theresult == true) {
																								//Agora se_finalizado==1!
																								//Selecionar o próximo juiz ativo para escolha, que deverá ser o
																								//que tem o perídodo de escolha mais próximo e mais antigo.
																								//Achar a opção de escolha que tem ínicio_prazo mais próximo da data atual
																								simpleResultSQL(`select codigo as codigo_opcao_escolha from (select MIN(julianday(inicio_prazo) ` +
																									`-julianday(?)) as diffdata,codigo from opcao_escolha where codigo_escala=? ` +
																									`and se_finalizado=0 group by codigo_escala )`,
																									[auxData, codigo_escala], 'codigo_opcao_escolha').then
																									(
																										codigo_opcao_escolha => {
																											if (codigo_opcao_escolha !== undefined) {
																												//Achamos ! Agora o inicio do prazo deve ser atualizado para a
																												//data de hoje!
																												simpleExecSQL(` update opcao_escolha set inicio_prazo=? where codigo=?`
																													, [auxData, codigo_opcao_escolha]).then(
																														theresult2 => {
																															if (theresult2 == true) {
																																//Tá... mais e o rf do juiz ativo para escolha ?
																																simpleResultSQL(`select rf_juiz from opcao_escolha where codigo=?`, [codigo_opcao_escolha], 'rf_juiz').then(
																																	novo_rf_juiz => {
																																		if (novo_rf_juiz !== undefined) {
																																			simpleExecSQL(` update escala_plantao set rf_juiz_ativo_para_escolha=? ` +
																																				`where codigo=?`, [novo_rf_juiz,codigo_escala]).then
																																				(
																																					result3 => {
																																						if (result3 == true) {
																																							res.status(200).json({ 'mensagem': 'O novo juiz ativo para escolha foi ativado!' });
																																						}
																																						else {
																																							res.status(500).json({ 'mensagem': '5015:Erro no Banco de Dados!' });
																																						}																																						
																																					}, err9 => {
																																						res.status(500).json({ 'mensagem': '4992:Erro no Banco de Dados!' });
																																					}
																																				);

																																		}
																																		else {
																																			res.status(500).json({ 'mensagem': '4989:Erro no Banco de Dados!' });
																																		}
																																	}, err8 => {
																																		res.status(500).json({ 'mensagem': '4987:Erro no Banco de Dados!' });
																																	}
																																);
																															}
																															else {
																																res.status(500).json({ 'mensagem': '4985:Erro no Banco de Dados!' });
																															}
																														}, err7 => {
																															res.status(500).json({ 'mensagem': '4983:Erro no Banco de Dados!' });
																														}
																													);
																											}
																											else {
																												///Não há mais juiz ativos para escolha disponíveis
																												res.status(200).json({ 'mensagem': 'Não há mais opções de escolha disponíveis!' });
																											}
																										}, err6 => {
																											res.status(500).json({ 'mensagem': '4977:Erro no Banco de Dados!' });
																										}
																									);
																							}
																							else {
																								res.status(500).json({ 'mensagem': '4969:Erro no Banco de Dados!' });
																							}
																						},
																						err5 => {
																							res.status(500).json({ 'mensagem': '4971:Erro no Banco de Dados!' });
																						}
																					);


																			}
																			else {
																				res.status(500).json({ 'mensagem': `A opção de escolha atual ainda está aberta!` });
																			}

																		},
																		err3 => {
																			res.status(500).json({ 'mensagem': `4955:Erro de Banco de dados!` });
																		}																		
																	)

															}, err4 => {
																res.status(500).json({ 'mensagem': `4949:Erro de Banco de dados!` });
															}
														);
												}
											},
											err2 => {
												res.status(500).json({ 'mensagem': `4804:Erro de Banco de dados!` });
											}
										);
									},
									erroRg => {
										res.status(500).json({ 'mensagem': `4809:Erro de Banco de dados!` });
									}
								);
						},
						errCount1 => {
							res.status(500).json({ 'mensagem': `4685:Erro de Banco de dados!` });
						}
				);
			}
		},
		err1 => {
			res.status(500).json({ 'mensagem': `4968:Erro de Banco de dados!` });
		}
	);


});


/*
Operação: Iniciar período de escolha de livre
Entidades: Escala de Plantão, Opção de Escolha
Método: POST
Interface: /iniciar_periodo_escolha_livre
Entrada: Um json com o nome da escala de plantão
Exemplo: {"escala_plantao":" plantão regional fev/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"escala_plantao\":\"plantao regional abr/2023\"}" https://localhost:3000/iniciar_periodo_escolha_livre

Funcionalidade associada: iniciar_periodo_escolha_livre
Funcionamento: Neste caso, ocorre a alteração do campo fase da entidade “Escala de Plantão” para “escolha livre”.  Em suma, o administrador da escala decide liberar a escala para que “qualquer” magistrado possa selecionar plantões livres.
No período de escolha livre, qualquer juiz pode decidir atuar em algum plantão. Quem marcar primeiro leva. Quando o administrador da escola inicia o período de escolha livre, o campo fase da entidade “Escala de Plantão” muda para “escolha livre”.  O administrador simplesmente informa o nome da escala de plantão e pronto.

*/
app.post('/iniciar_periodo_escolha_livre', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let escalaPlantao = thebody.escala_plantao;
	
	//Quem é o usuário?	
	theUser = req.session.myToKen.user;

	const auxfunc = async () => {
		//Pegando as regionais associadas à escala de plantão
		let theRegionais = await simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
			` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
			`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
			`  where ep.nome = ?))`, [escalaPlantao], 'regional');

		let passou = await verificaFuncionalidade(theUser, "iniciar_periodo_escolha_livre", theRegionais);
		if (passou == true) {
			let jainiciada = await simpleResultSQL(`select COUNT(*) as theCount from escala_plantao ep where ep.nome=? and fase='escolha livre'`, [escalaPlantao], "theCount");
			if (jainiciada > 0) {
				res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" já tinha sido iniciada para escolha livre !` });
			}
			else {
				let codigo_escala = await simpleResultSQL(`select codigo as codigo_escala from escala_plantao where nome=?`, [escalaPlantao],'codigo_escala');
				if (codigo_escala === undefined || codigo_escala === null) {
					res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" não existe!` });
				}
				else {
					//Vamos então abrir a escala e fechar todas as opções de escolha dos magistrados associados à escala!
					let sql1 = `update escala_plantao set fase='escolha livre' where nome=?`;
					let sql2 = `update opcao_escolha set se_finalizado=1 where codigo_escala=?`;
					let params1 = [escalaPlantao];
					let params2 = [codigo_escala];
					let theresult = await multipleExecSQLWithTransaction([sql1, sql2], [params1, params2]);
					if (theresult == true) {
						res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" foi aberta para escolha livre para escolha!` });
					}
					else {
						res.status(500).json({ 'mensagem': '5309: Ocorreu algum erro no Banco de Dados!' });
					}				
				}
			}
		}
		else {
			res.status(500).json({ 'mensagem': `Usuário não autorizado a iniciar o período de escolha do plantão!` });
		}
	}

	//Chamar o método assíncrono de forma protegida!
	try {
		auxfunc();
	} catch (err) {
		res.status(500).json({ 'mensagem': '5380:Erro no Banco de Dados!' });
	}
	

});

/*
Operação: Fechamento de escala de plantão
Entidades: Escala de Plantão, Opção de Escolha
Método: POST
Interface: /fechar_escala_plantao
Entrada: Um json com o nome da escala de plantão
Exemplo: {"escala_plantao":" plantão regional fev/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"escala_plantao\":\"plantao regional abr/2023\"}" https://localhost:3000/fechar_escala

Funcionalidade associada: fechar_escala_plantao

Funcionamento: Neste caso, ocorre a alteração do campo fase da entidade “Escala de Plantão” para a fase “fechada”.  Em suma, o administrador da escala decide fechar a escala, o que significa que os plantões não podem mais ser escolhidos e a Portaria de Plantão poderá ser emitida, bem como as designações poderão ser efetuadas. 

*/

app.post('/fechar_escala', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let escalaPlantao = thebody.escala_plantao;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user;

	const auxfunc = async () => {
		//Pegando as regionais associadas à escala de plantão
		let theRegionais = await simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
			` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
			`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
			`  where ep.nome = ?))`, [escalaPlantao], 'regional');

		let passou = await verificaFuncionalidade(theUser, "fechar_escala_plantao", theRegionais);
		if (passou == true) {
			let jainiciada = await simpleResultSQL(`select COUNT(*) as theCount from escala_plantao ep where ep.nome=? and fase='fechada'`, [escalaPlantao], "theCount");
			if (jainiciada > 0) {
				res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" já tinha sido fechada !` });
			}
			else {
				let codigo_escala = await simpleResultSQL(`select codigo as codigo_escala from escala_plantao where nome=?`, [escalaPlantao], 'codigo_escala');
				if (codigo_escala === undefined || codigo_escala === null) {
					res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" não existe!` });
				}
				else {
					//Vamos então abrir a escala e fechar todas as opções de escolha dos magistrados associados à escala!
					let theresult = await simpleExecSQL(`update escala_plantao set fase='fechada' where nome=?`, [escalaPlantao])
					if (theresult == true) {
						res.status(200).json({ 'mensagem': `A escala de plantão "${escalaPlantao}" foi fechada!` });
					}
					else {
						res.status(500).json({ 'mensagem': '5332: Ocorreu algum erro no Banco de Dados!' });
					}
				}
			}
		}
		else {
			res.status(500).json({ 'mensagem': `Usuário não autorizado a fechar escalas de plantão!` });
		}
	}

	//Chamar o método assíncrono de forma protegida!
	try {
		auxfunc();
	} catch (err) {
		res.status(500).json({ 'mensagem': '5346:Erro no Banco de Dados!' });
	}


});


/*

Operação: Designação de Plantonistas
Entidades: Designação, Plantão Juiz
Método: POST
Interface: /designar_magistrados_escala
Entrada: Um json com o nome da escala de plantão
Exemplo: {"escala_plantao":" plantão regional fev/2023"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"escala_plantao\":\"plantao regional abr/2023\"}" https://localhost:3000/designar_magistrados_escala

Funcionalidade associada: designar_magistrados_escala

Funcionamento: Quando acionada, a rotina registra a designação de todos os magistrados que possuem plantões escolhidos para atuação no plantão, exceto para as situações em que as designações já foram certificadas. Deste modo, um plantão já cumprido não pode ter sua “designação alterada” exceto de forma manual.



*/
app.post('/designar_magistrados_escala', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	let escalaPlantao = thebody.escala_plantao;

	//Quem é o usuário?	
	theUser = req.session.myToKen.user;

	const auxfunc = async () => {
		//Pegando as regionais associadas à escala de plantão
		let theRegionais = await simpleResultSQLtoStringArray(`select distinct r.nome as regional from regional r where codigo in (select distinct epr.codigo_regional as codigo ` +
			` from escala_plantao_regional epr where epr.codigo_escala_plantao in ( ` +
			`  select distinct ep.codigo as codigo_escala_plantao from escala_plantao ep ` +
			`  where ep.nome = ?))`, [escalaPlantao], 'regional');

		let passou = await verificaFuncionalidade(theUser, "designar_magistrados_escala", theRegionais);
		if (passou == true) {

			//Para todos os plantões que não possuem certificações cadastradas, "designar" os respectivos magistrados plantonistas.

			//Passo 1: Sql para Apagar todas as designações não certificadas associadas à escala de plantão, exceto naqueles plantões que existam pelo menos 1 certificação		
			sqlApagaDesignacoes = `delete from designacao where codigo in ( `+
				` select d.codigo from escala_plantao esp, escolha_plantao ep, plantao p, designacao d `+
				` where	esp.codigo = p.codigo_escala and esp.nome = ? and ` +
				` ep.codigo_plantao = p.codigo and ep.codigo_plantao = d.codigo_plantao and d.usuario_certificador is null ` +
				` and ep.codigo_plantao not in (select distinct codigo_plantao from designacao where usuario_certificador is not null)) `;	

			//Passo 2: Sql para Inserir as designações novamente
			sqlInsereDesignacoes = `insert into designacao(codigo_plantao,rf_juiz) select ep.codigo_plantao, ep.rf_juiz ` +
				`from escala_plantao esp, escolha_plantao ep, plantao p ` +
				` where esp.codigo = p.codigo_escala and esp.nome = ? and ep.codigo_plantao = p.codigo and ` +
				` ep.codigo_plantao not in (select distinct codigo_plantao from designacao where codigo_plantao = ep.codigo_plantao and ` +
				`	usuario_certificador is not null )`;

			//Passo 3: Colocar tudo em uma transação e rodar!
			let theResult = await multipleExecSQLWithTransaction([sqlApagaDesignacoes, sqlInsereDesignacoes], [escalaPlantao, escalaPlantao]);

			if (theResult == true) {
				res.status(200).json({ 'mensagem': `As designações foram inseridas com sucesso para o plantao ${escalaPlantao}` });
			}
			else {
				res.status(500).json({ 'mensagem': `5415: Erro de banco de dados!` });
			}
		}
		else {
			res.status(500).json({ 'mensagem': `Usuário não autorizado a fechar escalas de plantão!` });
		}
	}

	//Chamar o método assíncrono de forma protegida!
	try {
		auxfunc();
	} catch (err) {
		res.status(500).json({ 'mensagem': '5346:Erro no Banco de Dados!' });
	}


});


/*
Operação: Inserir Modelo de texto
Entidades: Modelo de texto
Método: POST
Interface: /modelo_texto
Entrada: Um json com o nome do modelo de texto, e o texto do modelo em si.
Exemplo: {"modelo":"plantao regional","texto":"texto e parâmetros"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X POST -d "{\"modelo\":\"modelo1\",\"texto\":\"texto e parâmetros\"}" https://localhost:3000/modelo_texto


Funcionalidade associada: inserir_modelo_texto 

Funcionamento: Simplesmente é inserido um modelo com um determinado nome e conteúdo. A operação é permitida para o usuário master e para aqueles que possuem direito à funcionalidade “inserir_modelo_texto”.

*/
app.post('/modelo_texto', jsonParser, function (req, res) {
	var thebody = req.body;
	var theModelo = thebody.modelo;
	var theTexto = thebody.texto;

	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master ou se possui a funcionalidade
	//inserir_modelo_texto
	theUser = req.session.myToKen.user

	const auxfunc = async () => {
		let passou = await verificaFuncionalidade(theUser, "inserir_modelo_texto", undefined);
		if (passou == true) {
			//Vamos agora verificar se o modelo já existe
			let countModelos = await simpleResultSQL("select count(*) as theCount from modelo_texto where nome=?", [theModelo], 'theCount');
			if (countModelos == 0) {
				//Vamos então incluir o modelo
				let theresult = await simpleExecSQL("insert into modelo_texto(nome,texto) values (?,?)", [theModelo, theTexto]);
				if (theresult == true) {
					res.status(200).json({ 'mensagem': `O modelo ${theModelo} foi incluído com sucesso` });
				}
				else {
					res.status(500).json({ 'mensagem': 'Ocorreu um erro na inclusão do modelo!' });
				}
			}
			else {
				res.status(500).json({ 'mensagem': 'O modelo já tinha sido cadastrado!' });
			}
		}
		else {
			res.status(500).json({ 'mensagem': 'O usuário não está autorizado a incluir modelos!' });
		}
	}

	try {
		auxfunc();
	}
	catch (errFunc) {
		res.status(500).json({ 'mensagem': '5515:Ocorreu um erro na inclusão do Modelo!' });
	}

});

/*
Operação: Alterar modelo de texto
Entidades: Modelo de texto
Método: PUT
Interface: /modelo_texto
Entrada: Um json com o nome do modelo de texto, e o texto do modelo em si.
Exemplo: {"modelo":"plantao regional","texto":"texto e parâmetros"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X PUT -d “{\"modelo\":\"plantao regional\",\"texto\":\"texto e parâmetros\"}" https://localhost:3000/modelo_texto

Funcionalidade associada: alterar_modelo_texto 

Funcionamento: Simplesmente altera o modelo de texto com um novo conteúdo. A operação é permitida para o usuário master e para aqueles que possuem direito à funcionalidade “alterar_modelo_texto”.

*/
app.put('/modelo_texto', jsonParser, function (req, res) {
	var thebody = req.body;
	var theModelo = thebody.modelo;
	var theTexto = thebody.texto;

	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master ou se possui a funcionalidade
	//inserir_modelo_texto
	theUser = req.session.myToKen.user

	const auxfunc = async () => {
		let passou = await verificaFuncionalidade(theUser, "alterar_modelo_texto", undefined);
		if (passou == true) {
			//Vamos agora verificar se o modelo já existe
			let countModelos = await simpleResultSQL("select count(*) as theCount from modelo_texto where nome=?", [theModelo], 'theCount');
			if (countModelos > 0) {
				//Vamos então incluir o modelo
				let theresult = await simpleExecSQL("update modelo_texto set texto=? where nome=?", [theModelo, theTexto]);
				if (theresult == true) {
					res.status(200).json({ 'mensagem': `O modelo ${theModelo} foi alterado com sucesso` });
				}
				else {
					res.status(500).json({ 'mensagem': 'Ocorreu um erro na alteração do modelo!' });
				}
			}
			else {
				res.status(500).json({ 'mensagem': 'O modelo não existe!' });
			}
		}
		else {
			res.status(500).json({ 'mensagem': 'O usuário não está autorizado a alterar modelos!' });
		}
	}

	try {
		auxfunc();
	}
	catch (errFunc) {
		res.status(500).json({ 'mensagem': '5515:Ocorreu um erro na inclusão do Modelo!' });
	}

});

/*
Operação: Excluir modelo de texto
Entidades: Modelo de texto
Método: DELETE
Interface: /modelo_texto
Entrada: Um json com o nome do modelo de texto, e o texto do modelo em si.
Exemplo: {"modelo":"plantao regional"}
Headers: e-token no header "x-access-token"
Saída: Um json informando o sucesso ou fracasso da operação -> {"mensagem":"Sucesso!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: 

curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X DELETE -d “{\"modelo\":\"plantao regional\"}" https://localhost:3000/modelo_texto

Funcionalidade associada: excluir_modelo_texto 

Funcionamento: Simplesmente exclui um modelo de texto com um novo conteúdo. A operação é permitida para o usuário master e para aqueles que possuem direito à funcionalidade “excluir_modelo_texto”.

*/
app.delete('/modelo_texto', jsonParser, function (req, res) {
	var thebody = req.body;
	var theModelo = thebody.modelo;
	

	//Verificar se o usuário que acionou o serviço pode fazer a inclusão, isto é, se o mesmo possui o perfil master ou se possui a funcionalidade
	//inserir_modelo_texto
	theUser = req.session.myToKen.user

	const auxfunc = async () => {
		let passou = await verificaFuncionalidade(theUser, "excluir_modelo_texto", undefined);
		if (passou == true) {
			//Vamos agora verificar se o modelo já existe
			let countModelos = await simpleResultSQL("select count(*) as theCount from modelo_texto where nome=?", [theModelo], 'theCount');
			if (countModelos > 0) {
				//Vamos então incluir o modelo
				let theresult = await simpleExecSQL("delete from modelo_texto where nome=?", [theModelo]);
				if (theresult == true) {
					res.status(200).json({ 'mensagem': `O modelo ${theModelo} foi excluído com sucesso!` });
				}
				else {
					res.status(500).json({ 'mensagem': 'Ocorreu um erro na exclusão do modelo!' });
				}
			}
			else {
				res.status(500).json({ 'mensagem': 'O modelo não existe!' });
			}
		}
		else {
			res.status(500).json({ 'mensagem': 'O usuário não está autorizado a excluir modelos!' });
		}
	}

	try {
		auxfunc();
	}
	catch (errFunc) {
		res.status(500).json({ 'mensagem': '5515:Ocorreu um erro na inclusão do Modelo!' });
	}

});

/*
Operação: Listar Modelos de Texto
Entidades: Modelo de Texto
Método: GET
Interface: /modelos_texto
Entrada: Um json contendo o início, o fim, o tipo de ordenação e o campo de ordenação. Exemplos: 

{"inicio":"1", "fim":"10", ”ordem”:”desc”, ”campo”:”codigo”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}
{"inicio":"A", "fim":"B", ” ordem”:”asc”, ”campo”:”nome”}

Headers: e-token no header “x-access-token”

Saída: Um json com a listagem json com os dados dos modelos de texto, maiores ou igual ao início e menores ou igual ao final em relação ao campo de ordenação.
{
	“modelos_texto”:[
		{“nome”:”plantao regional”, “texto”:”conteúdo do modelo”},
		{“nome”:”plantao local”, “texto”:”conteúdo do modelo”},
		....
	]
}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d "{\"inicio\":\"1\", \"fim\":\"10\", \”ORDEM\”:\”ASC\”, \”campo\”:\”codigo\”}" https://localhost:3000/modelos_texto

Funcionamento: Tal método pode ser usado por qualquer um


*/

app.get('/modelos_texto', jsonParser, function (req, res) {
	//console.log("Vou tentar validar o usuário e senha");
	var thebody = req.body;
	var inicio = thebody.inicio;
	var fim = thebody.fim;
	var ordem = thebody.ordem;
	var campo = thebody.campo;

	if (campo === undefined || campo == null) {
		campo = 'codigo';
	}
	if (inicio === undefined || inicio == null) {
		inicio = 1;
	}
	if (fim === undefined || fim == null) {
		fim = 100000;
	}
	if (ordem == undefined || ordem == null) {
		ordem = "asc";
	}

	listSQLtoJSON("modelo_texto", "modelos", ["codigo", "nome", "texto"], campo, inicio, fim, ordem).then
		(
			theResult => {
				res.status(200).json(JSON.parse(theResult));
			},
			theError => {
				res.status(500).json({ 'mensagem': theError });
			}
		);
});


//"urlCount": "/CountEntity?qualEntidade=CDP",
app.get('/CountEntity', function (req, res) {    
    
	var entidade = req.query.qualEntidade;
	
	const myfunc = async ()=>{
		let theCount = await simpleResultSQL(`select count(*) as theCount from ${entidade}`,[],'theCount');		
		res.status(200).json(theCount);
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5367:Erro no Banco de Dados!' });
	}
});

function get_entidadeOrId_from_tipo_id(tipoId, option){
	let auxArray = undefined;
	let theId = undefined;
	let tipo =  undefined;

	if(tipoId.indexOf('_(')!=-1){
		auxArray=tipoId.split("_(");
		tipo = auxArray[0];
		theId = auxArray[1];
		theId = theId.substr(0,theId.length-1);		
	}
	else{
		auxArray = tipoId.split("_");
		//last_
		let i = auxArray.length -1;
		theId = auxArray[i];
		tipo = '';
		for(let k =0;k < i;k++){
			if(k>0){
				tipo += '_';
			}
			tipo += auxArray[k];
		}
	
	}

	
	if(option=='entidade'){
		return tipo;
	}
	else{
		return theId;
	}
	

}

//urlObter: /Obter/?Tipo_Id=Entidade_
app.get('/Obter',(req,res)=>{
	let tipoId = req.query.Tipo_Id;

	if (tipoId == "" || tipoId == null) {
        res.status(500).json({ 'mensagem': 'Faltou um parâmetro! Tipo_Id!' });
    }

	let entidade = get_entidadeOrId_from_tipo_id(tipoId,'entidade'); //tipoId.split("_")[0];
    let Id = get_entidadeOrId_from_tipo_id(tipoId,'id'); //tipoId.split("_")[1];
	let auxExp = expFromMultiplePKs(Id);
	

	const myfunc = async ()=>{		
		
		let arrayFields = await simpleResultSQLtoStringArray(`select name from pragma_table_info(?)`,[entidade],'name');
		let auxFields = stringArrayToCommaListAdvanced(arrayFields,'','','');	
		let primaryKeys = await simpleResultSQLtoStringArray(`select name from pragma_table_info(?) where pk=1;`,[entidade],'name')
		let pkeyField = primaryKeys[0];
		if(auxExp === undefined){
			auxExp = `${pkeyField}=${Id}`
		}

		let arrayValues = await multipleResultSQL(`select ${auxFields} from ${entidade} where ${auxExp}`,[],arrayFields);
		
		//Agora vamos fabricar o json de retorno.
		let auxJson='{';
		for(let i=0;i<arrayFields.length;i++){
				let theField = arrayFields[i];
				let theValue = arrayValues[i];
				if(i>0){
					auxJson+= ',';
				}
				if(theValue !== undefined && theValue != null){
					auxJson += `"${theField}":"${theValue}"`;
				}
				else{
					auxJson += `"${theField}":${theValue}`;
				}
				
		}	
		auxJson +='}';
		res.status(200).json(JSON.parse(auxJson));
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5765:Erro no Banco de Dados!' });
	}

});

//"urlLoadObjetos": "/Listar?qualEntidade=CDP&pageSize=",
app.get('/Listar',(req,res)=>{
    let entidade = req.query.qualEntidade;
    let pageSize = req.query.pageSize;
    let auxFiltro = req.query.filtro;
    var page = req.query.page;

    var theSkip = (page != null && page!= "" && pageSize != "" && pageSize != null)? ((Number.parseInt(page)-1) * Number.parseInt(pageSize)):0;



	let filtro = filtroToSQLWhere(auxFiltro);
	filtro = (filtro == '') ? '':(' where ' + filtro);

	const myfunc = async ()=>{		
		let arrayFields = await simpleResultSQLtoStringArray(`select name from pragma_table_info(?)`,[entidade],'name');
		let auxFields = stringArrayToCommaListAdvanced(arrayFields,'','','');		
		let arrayValues = await multipleResultSQLtoStringArrays(`select ${auxFields} from ${entidade} ${filtro} LIMIT ? OFFSET ?`,
									[pageSize,theSkip],arrayFields);
		

		
		//Agora vamos fabricar o json de retorno.
		let auxJson='[';
		for(let k=0;k<arrayValues.length;k++){
			if(k>0){
				auxJson +=','
			}
			auxJson+='{'
			for(let i=0;i<arrayFields.length;i++){
				let theField = arrayFields[i];
				let theValue = arrayValues[k][i];
				if(i>0){
					auxJson+= ',';
				}
				if(theValue !== undefined && theValue != null){
					auxJson += `"${theField}":"${theValue}"`;
				}
				else{
					auxJson += `"${theField}":null`;
				}
				
			}	
			auxJson += '}'
		}

		auxJson +=']';
		res.status(200).json(JSON.parse(auxJson));
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5800:Erro no Banco de Dados!' });
	}	
});

//Incluir genérico
//Vou receber um json do tipo:
//{"tipo":"Usuário","dados":{"nome":"José Cocão","email":"josecocao@trf3.jus.br"}}
app.post('/Incluir', jsonParser,(req,res)=>{
	let thebody = req.body;
	let entidade = thebody.tipo;
	var arrayDados = thebody.dados;

	auxFields =Object.keys(arrayDados);
	auxValues =Object.values(arrayDados);

	//Limpa valores de CalcObject
	for(let i=0;i<auxValues.length;i++){
		auxValues[i] = replaceCalcObjectID(auxValues[i]);
	}
	
	theFields = stringArrayToCommaListAdvanced(auxFields,'(',')','');
	theValues = stringArrayToCommaListAdvanced(auxValues,"(",")","'");

	const myfunc = async ()=>{	
		let theresult = await simpleExecSQL(`insert into ${entidade}${theFields} VALUES ${theValues}`,[]);
		if(theresult == true){
			res.status(200).json({message: "Inclusão efetuada com sucesso"});
		}
		else{
			res.status(500).json({message: "Erro na Inclusão!"});
		}		
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5800:Erro no Banco de Dados!' });
	}	

});

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

//Alterar Genérico
//Vou receber um json do tipo:
//{"tipo":"Usuário","dados":{"nome":"José Cocão","email":"josecocao@trf3.jus.br"}}
app.put('/Alterar', jsonParser,(req,res)=>{
	let thebody = req.body;
	let entidade = thebody.tipo;
	var arrayDados = thebody.dados;

	const myfunc = async ()=>{	
		let primaryKeys = await simpleResultSQLtoStringArray(`select name from pragma_table_info(?) where pk=1;`,[entidade],'name');
		let pkeyField = primaryKeys[0];
		let pkeyValue = arrayDados[pkeyField];
		pkeyValue = replaceCalcObjectID(pkeyValue);

		auxFields =Object.keys(arrayDados);
		auxValues =Object.values(arrayDados);

		//Limpa valores de CalcObject
		for(let i=0;i<auxValues.length;i++){
			auxValues[i] = replaceCalcObjectID(auxValues[i]);
		}	

		let auxExp = [];
		for(let i=0;i<auxFields.length;i++){
			if(auxFields[i]==pkeyField){
				auxExp.push(`${pkeyField}='${pkeyValue}'`)
			}
			else{
				auxExp.push(`${auxFields[i]}='${auxValues[i]}'`)
			}			
		}
		let exp = stringArrayToCommaListAdvanced(auxExp,'','','');
	

		let theresult = await simpleExecSQL(`update ${entidade} set ${exp} where ${pkeyField}=${pkeyValue}`,[]);
		if(theresult == true){
			res.status(200).json({message: "Alteração efetuada com sucesso"});
		}
		else{
			res.status(500).json({message: "Erro na Alteração!"});
		}		
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5800:Erro no Banco de Dados!' });
	}	

});

function expFromMultiplePKs(Id){
		//campo1||campo2||campo3||campo4->1||2||3||4
		if(/\w+([|][|]\w+)+->\d+([|][|]\d+)+/i.test(Id)){			
			let auxFields = Id.split('->')[0];
			let auxValues = Id.split('->')[1];
			auxFields = auxFields.split('||');
			auxValues = auxValues.split('||')
			let auxexp = ''
			for(let i=0;i<auxFields.length;i++){
				if(i >0){
					auxexp += " and ";
				}
				auxexp += `${auxFields[i]}='${auxValues[i]}'`;
			}
			return auxexp;
		}
		else{
			return undefined;
		}
}

app.delete('/Apagar',(req,res)=>{
	let tipoId = req.query.Tipo_Id;

	if (tipoId == "" || tipoId == null) {
        res.status(500).json({ 'mensagem': 'Faltou um parâmetro! Tipo_Id!' });
    }

	let entidade = get_entidadeOrId_from_tipo_id(tipoId,'entidade'); //tipoId.split("_")[0];
    let Id = get_entidadeOrId_from_tipo_id(tipoId,'id'); //tipoId.split("_")[1];
	let auxExp = expFromMultiplePKs(Id);


	const myfunc = async ()=>{		
		let primaryKeys = await simpleResultSQLtoStringArray(`select name from pragma_table_info(?) where pk=1;`,[entidade],'name');
		let pkeyField = primaryKeys[0];

		if(auxExp === undefined){
			auxExp = `${pkeyField}=${Id}`
		}

		let theresult = await simpleExecSQL(`delete from ${entidade} where ${auxExp}`,[]);
		if(theresult == true){
			res.status(200).json({message: "Exclusão efetuada com sucesso!"});
		}
		else{
			res.status(500).json({message: "Erro na Exclusão!"});
		}		
	
	}
	
	try{
		myfunc();
	}
	catch(err){
		res.status(500).json({ 'mensagem': '5998:Erro no Banco de Dados!' });
	}

});

function myStringReplace(Source, thePattern, theReplacement) {
	let auxResult = '';
	let auxArray = Source.split(thePattern);
	for (let i = 0; i < auxArray.length; i++) {
		if (i > 0) {
			auxResult += theReplacement;
		}
		auxResult += auxArray[i];
	}
	return auxResult;
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
/*
Operação: Gerar texto a partir de modelo
Entidades: Modelo de texto
Método: GET
Interface: /gerar_texto_modelo
Entrada: Um json com o nome do modelo de texto, e uma “árvore de parâmetros” no modelo json, que servirá para preencher o modelo e gerar o texto desejado. 
Exemplo: {"modelo":"plantao regional","parametros":{ÁRVORE DE PARÂMETROS!}}
Headers: e-token no header "x-access-token"
Saída: Um json com o texto gerado ->{"texto”:"Conteúdo do texto!"} ou {"mensagem":"Ocorreu um erro..."}

Exemplo curl: curl -k -H "Content-Type: application/json" -H "x-access-token:%etoken%" -X GET -d “{\"modelo\":\"plantao regional\",\"parâmetros\":{ÁRVORE DE PARÂMETROS!}}" https://localhost:3000/gerar_texto_modelo

Funcionalidade associada: gerar_texto_modelo



Funcionamento: Dado um nome de modelo e uma lista de parâmetros com valores no formato JSON, a rotina gera um texto preenchendo o modelo com os respectivos parâmetros. A operação é permitida para o usuário master e para aqueles que possuem direito à funcionalidade “gerar_texto_modelo”.

Usando a notação de modelos, dado um json, simplesmente substitui parâmetros pelos respectivos valores no texto do modelo. Por enquanto, um json só tem um nível. Não podemos ter arrays de arrays....

<<P1>> Pega as informações do json “P1”:”valor de P1” e substituem no texto.

<<T[n]>> Parâmetros do tipo array. Se temos “T”:[“batata”,”cebola”,”laranja”], então <<T[3]>> é “laranja”.

<<TABELA{	
	TITULO{“NOME”, “ENDEREÇO”, “TELEFONE”}
	DADOS{"PESSOAS.NOME"", "PESSOAS.ENDERECO","PESSOAS.TELEFONE"}
}>>

GERA:
<table style="border: 1px solid;">
	<tr><th>NOME</th><th>ENDEREÇO</th><th>TELEFONE</th></tr>
	<tr><td>FULANO</td><td>RUA DAS FLORES, 37</td><td>(67)9988-1133</td></tr>
	<tr><td>CICLANO</td><td>RUA DO PERIQUITO, 10</td><td>(67) 9999-1122</td></tr>
</table>

SE TEMOS NO JSON:

 {
...
Pessoas:[
	{‘Nome’:’FULANO’,’Endereço’:’ RUA DAS FLORES, 37’,’TELEFONE’:’(67)9988-1133’},
	{‘Nome’:’CICLANO’,’Endereço’:’RUA PERIQUITO, 10’,’TELEFONE’:’ (67) 9999-1122’},
]
...
}

*/

async function gera_texto_from_modelo(theModelo,parametros){
	const auxfuncGera = async () =>{
		//Vamos pegar o modelo
		let auxTextoModelo = await simpleResultSQL("select texto from modelo_texto where nome=?", [theModelo], 'texto');
		//O Modelo está codificado em base64 e também é convertido para caracteres de 1byte.
		//Temos que "abrir" o modelo. decodificar de base64 e decodificar de binário
		let decoded = Buffer.from(auxTextoModelo,'base64').toString('ascii');
		let textoModelo= fromBinary(decoded);		

		if (textoModelo !== undefined) {
			//Passo 1: Encontrar todas as partes substituíveis no modelo... partes que estão entre << >>
			const auxregexp = /\<\<(TABELA\{.+?\}|[^\>][^\>]+)\>\>/gs;
			const simpleParam = /\<\<\w+\>\>/gs;
			const tableParam = /\<\<TABELA\{.+\}\>\>/gs;
			const textArrayParam = /\<\<\w+\[(\d+)\]+\>\>/gs;
			const tituloRegExp = /TITULO\{([^\}]+)\}/gs;
			const dadosRegExp = /DADOS\{([^\}]+)\}/gs;
			textoModelo = myStringReplace(textoModelo,"&lt;&lt;","<<");
			textoModelo = myStringReplace(textoModelo,"&gt;&gt;",">>");
			const auxArray = [...textoModelo.matchAll(auxregexp)];
			let textoGerado = textoModelo;
			for (const auxValue of auxArray) {
				simpleParam.lastIndex =0;
				auxregexp.lastIndex =0;
				tableParam.lastIndex =0;
				textArrayParam.lastIndex=0;
				tituloRegExp.lastIndex=0;
				dadosRegExp.lastIndex=0;
				//É parâmetor simples <<NOME>> ou complexo <<NOME[1]>>, <<TABELA{ qualquer coisa}>>
				let theMatch = auxValue[0];
				let auxGroup = auxValue[1];

				if (simpleParam.test(theMatch)) { //Parâmetro Simples
					//Pegar o valor no json!
					let paramValue = parametros[auxGroup];

					//Substituir no texto
					textoGerado = myStringReplace(textoGerado, theMatch, paramValue);

				} else if (tableParam.test(theMatch)){//Parâmetro Tabela
					//Pegar o Título e os Parâmetros filhos.
					
					const auxTituloArray = [...auxGroup.matchAll(tituloRegExp)];
					const auxDadosArray = [...auxGroup.matchAll(dadosRegExp)];						
					if (auxTituloArray[0] !== undefined) {							
						if (auxDadosArray[0] !== undefined) {
							let auxTable = '<table style="border: 1px solid;"';
							//Cabeçalho da tabela
							let auxTituloS = auxTituloArray[0][1];
							let auxTituloA = auxTituloS.split(",");
							auxTable += '<tr>';
							for (let i = 0; i < auxTituloA.length; i++) {
								let auxTitulo = auxTituloA[i];
								auxTitulo = myStringReplace(auxTitulo,'"','');
								auxTable += ('<th>' + auxTitulo + '</th>');
							}
							auxTable += '</tr>';
							//Dados
							let auxDadosS = auxDadosArray[0][1];
							let auxDadosA = auxDadosS.split(",");
							//Tenho que pegar os valores dos dados. Uma tabela!								
							let arrayNomesDados = [];
							let arrayParametrosRaiz = [];
							for (i = 0; i < auxDadosA.length; i++) {
								//Contatos.Nome -> O primeiro parâmetro é o nome do parâmetro raiz. O segundo é o dado
								let parametroRaiz = myStringReplace(auxDadosA[i],'"','').split(".")[0];
								let nomeDadoI = myStringReplace(auxDadosA[i],'"','').split(".")[1];
								arrayNomesDados.push(nomeDadoI);
								arrayParametrosRaiz.push(parametroRaiz);
							}
							//Agora vamos montar a tabela ... só vale o parâmetro Raiz inicial 
							let parametroRaizMestre = arrayParametrosRaiz[0];
							//Quantos elementos temos?
							let nValues = Object.values(parametros[parametroRaizMestre]);
							let nElementos = nValues.length;
							//Montando os dados
							for (let i = 0; i < nValues.length; i++) {
								auxTable += '<tr>';
								for (let j = 0; j < arrayNomesDados.length; j++) {
									nomeDado = arrayNomesDados[j];
									valorDado = nValues[i][nomeDado];
									auxTable += ('<td>' + valorDado+ '</td>');

								}
								auxTable += '</tr>';
							}
							auxTable += '</table>';

							//Pronto a tabela está pronta. Temos que substituir o parâmetro inicial pela tabela!
							textoGerado = myStringReplace(textoGerado, theMatch, auxTable);
						}
					}
					

				} else if (textArrayParam.test(theMatch)) {//Parâmetro valores de uma lista
					//O grupo 2 é o índice... Começa de um...
					//O grupo 1 é o nome da variável
					let auxArrayIdx = theMatch.split('[');
					let auxGroup2 = myStringReplace(auxArrayIdx[1],']>>','');
					let auxIndice = parseInt(auxGroup2);
					let nomeParametro = myStringReplace(auxArrayIdx[0],'<<','');
					let paramValue = parametros[nomeParametro][auxIndice-1];
					textoGerado = myStringReplace(textoGerado, theMatch, paramValue);
				}					
			}
			let auxResult = toBinary(textoGerado);
			let encoded = Buffer.from(auxResult,'ascii').toString('base64');
			return { 'texto': `${encoded}` };
		}
		else {
			return {'mensagem':'O modelo não existe!'};
		}
	}

	try {
		let auxResult = auxfuncGera();
		return auxResult;
	}
	catch (errFunc) {
		return {'mensagem':'Erro na geração do texto!'};
	}	
}

app.post('/gerar_texto_modelo', jsonParser, (req, res) => {
	let thebody = req.body;
	let theModelo = thebody.modelo;
	let parametros = JSON.parse(thebody.parametros);

	//Verificar se o usuário que acionou o serviço pode fazer a geração do texto
	//gerar_modelo_texto
	theUser = req.session.myToKen.user

	const auxfunc = async () => {
		let passou = await verificaFuncionalidade(theUser, "gerar_texto_modelo", undefined);
		if (passou == true) {
			let auxResult = await gera_texto_from_modelo(theModelo,parametros);
			if(auxResult['mensagem']=== undefined){
				res.status(200).json(auxResult);
			}
			else{
				res.status(500).json(auxResult);
			}
		}
		else {
			res.status(500).json({ 'mensagem': 'O usuário não está autorizado a gerar textos a partir de modelos!' });
		}
	}

	try {
		auxfunc();
	}
	catch (errFunc) {
		res.status(500).json({ 'mensagem': 'Erro na geração do texto!' });
	}

});



https.createServer(optsLogin, app).listen(3000);
//http.createServer(app).listen(3000);

