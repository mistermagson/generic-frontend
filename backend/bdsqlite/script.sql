/* Regional */

create table if not exists regional (
	codigo integer primary key autoincrement,
	nome text not null	
);

create unique index if not exists idx_regional_nome on regional(nome);

/* Perfil*/

create table if not exists perfil (
	codigo integer primary key autoincrement,
	nome text not null,
	descricao text
);

create unique index if not exists idx_perfil_nome on perfil (nome);

/* Relacionamento n<->n  PerfilxRegional */

create table if not exists perfil_regional (
	codigo_regional integer not null,
	codigo_perfil integer not null,
	foreign key (codigo_regional) references regional(codigo)
		on update cascade
		on delete cascade,
	foreign key (codigo_perfil) references perfil (codigo)
		on update cascade
		on delete cascade	
);
create unique index if not exists idx_pr_codigox on perfil_regional(codigo_regional,codigo_perfil);

/*Relacionamento n<->n PerfilxFuncionalidade*/

create table if not exists perfil_funcionalidade (
	codigo_perfil integer not null,
	codigo_funcionalidade integer not null,

	foreign key (codigo_perfil) references perfil (codigo)
		on update cascade
		on delete cascade,

	foreign key (codigo_funcionalidade) references funcionalidade (codigo)
		on update cascade
		on delete cascade	


);
create unique index if not exists idx_pf_codigox on perfil_funcionalidade(codigo_funcionalidade,codigo_perfil);

/* Funcionalidade */

create table if not exists funcionalidade (
	codigo integer primary key autoincrement,
	nome text not null	
);

create unique index if not exists idx_funcionalidade_nome on funcionalidade (nome);

/* Usuário */

create table if not exists usuario (
	codigo integer primary key autoincrement,
	email text not null,
	nome text not null,
	senha text not null /*só para testes*/
);

create unique index if not exists idx_usuario_email on usuario(email);
create index if not exists idx_usuario_nome on usuario(nome);

/* Relacionamento nxn Usuário_x_Perfil*/

create table if not exists usuario_perfil(
	codigo_usuario integer not null,
	codigo_perfil integer not null,

	foreign key(codigo_perfil) references perfil(codigo)
		on update cascade
		on delete cascade,

	foreign key(codigo_usuario) references usuario(codigo)
		on update cascade
		on delete cascade

);

create unique index if not exists idx_usuario_perfil on usuario_perfil(codigo_usuario,codigo_perfil);

/*Estado*/

create table if not exists estado(
	codigo integer primary key autoincrement,
	nome text not null
);

create unique index if not exists idx_estado_nome on estado(nome);

/*Cidade*/

create table if not exists cidade(
	codigo_estado integer not null,
	codigo integer primary key autoincrement,
	nome text not null,
	foreign key (codigo_estado) references estado(codigo)
		on update cascade
		on delete cascade
);

create unique index if not exists idx_cidade_codestado_nome on cidade(codigo_estado, nome);
create index if not exists idx_cidade_nome on cidade(nome);


/*Secretaria*/
create table if not exists secretaria(
	codigo_regional integer not null,
	codigo_cidade integer not null,
	codigo integer primary key autoincrement,
	nome text not null,
	sigla text not null,
	foreign key (codigo_regional) references regional (codigo) 
		on update cascade
		on delete cascade,
	foreign key (codigo_cidade) references cidade(codigo)
		on update cascade
		on delete cascade
);

create unique index if not exists idx_secretaria_nome on secretaria(nome);
create unique index if not exists idx_secretaria_sigla on secretaria(sigla);

/* Juiz */

create table if not exists juiz (
	cod_secretaria integer not null,
	rf integer primary key not null,
	nome text not null,
	email text not null,
	antiguidade integer not null,
	cargo text not null,
	
	foreign key(cod_secretaria) references secretaria(codigo)
		on update cascade
		on delete cascade
	
);

create index if not exists idx_juiz_nome on juiz(nome);
create unique index if not exists idx_juiz_email on juiz (email);
create unique index if not exists idx_juiz_antiguidade on juiz(antiguidade);

/* Tipo de Afastamento */
create table if not exists tipo_afastamento(
	codigo integer primary key autoincrement,
	nome text not null,
	descricao text not null
);

create unique index if not exists idx_tipoafastamento_nome on tipo_afastamento(nome);


/*Afastamento*/

create table if not exists afastamento(
	rf_juiz integer not null,
	codigo_tipo_afastamento not null,
	codigo integer primary key autoincrement,
	inicio integer not null, /* unix time */
	fim integer not null /*unix time*/,
	foreign key(rf_juiz) references juiz(rf)
		on update cascade
		on delete cascade,
	foreign key(codigo_tipo_afastamento) references tipo_afastamento(codigo)
		on update cascade
		on delete cascade
	
);

/* Feriado */

create table if not exists feriado (	
	codigo_cidade integer,
	codigo_estado integer,
	codigo integer primary key autoincrement,
	nome text not null,
	inicio integer not null, /* unix time */
	fim integer not null,/*unix time*/

	foreign key (codigo_cidade) references cidade(codigo)
		on update set null
		on delete set null,
	foreign key (codigo_estado) references estado(codigo)
		on update set null
		on delete set null
);

create index if not exists  idx_feriado_inicio on feriado(inicio);
create index if not exists  idx_feriado_fim on feriado(fim);

/*Tipo de Plantão */

create table if not exists tipo_plantao(
	codigo integer primary key autoincrement,
	nome text not null,
	descricao text not null
);

create unique index if not exists idx_tp_nome on tipo_plantao(nome);

/* Vara Plantonista */

create table if not exists vara_plantonista(
	codigo_secretaria integer not null,
	codigo_tipo_plantao integer not null,
	codigo integer primary key autoincrement,
	inicio integer not null, /* unix time */
	fim integer not null,/*unix time*/
	
	foreign key (codigo_secretaria) references secretaria(codigo)
		on update cascade
		on delete cascade,

	foreign key (codigo_tipo_plantao) references tipo_plantao(codigo)
		on update cascade
		on delete cascade
);

create index if not exists  idx_vp_inicio on vara_plantonista(inicio);
create index if not exists  idx_vp_fim on vara_plantonista(fim);


/*Escala de Plantão*/

create table if not exists escala_plantao(
	rf_juiz_ativo_para_escolha integer not null,
	codigo_tipo_plantao integer not null,
	codigo integer primary key autoincrement,
	nome text not null,
	inicio integer not null, /* unix time */
	fim integer not null,/*unix time*/
	fase text not null,

	foreign key (rf_juiz_ativo_para_escolha) references juiz(rf)
		on update set null
		on delete set null,
	
	foreign key (codigo_tipo_plantao) references tipo_plantao(codig)
		on update cascade
		on delete cascade
	
);

create index if not exists idx_ep_nome on escala_plantao(nome);

/*Relacionamento NxN Escala de Plantão regional*/

create table if not exists escala_plantao_regional(
	codigo_escala_plantao integer not null,
	codigo_regional integer not null,

	foreign key(codigo_escala_plantao) references escala_plantao(codigo)
		on update cascade
		on delete cascade,

	foreign key(codigo_regional) references regional(codigo)
		on update cascade
		on delete cascade
);


create unique index if not exists idx_ep_regional on escala_plantao_regional(codigo_escala_plantao,codigo_regional);

/*Opção de escolha*/

create table if not exists opcao_escolha(
	codigo_escala integer not null,
	rf_juiz integer not null,
	codigo integer primary key autoincrement,
	n_escolhas integer not null,
	inicio_prazo integer not null, /*unix time*/
	fim_prazo integer not null, /*unix time*/
	se_finalizado integer,

	foreign key (rf_juiz) references juiz(rf)
		on update set null
		on delete set null,
	foreign key (codigo_escala) references escala_plantao(codigo)
		on update set null
		on delete set null

);

create unique index if not exists idx_oe_escala_juiz on opcao_escolha(codigo_escala,rf_juiz);

/*Portaria*/
create table if not exists portaria(
	codigo_escala integer not null,	
	codigo integer primary key autoincrement,
	nome text not null,
	texto text not null,
	data_publicacao integer,/*unix time*/
	n_sei integer not null,
	url_consulta text not null,

	foreign key (codigo_escala) references escala_plantao(codigo)
		on update cascade
		on delete cascade

);

create unique index if not exists idx_portaria_nome on portaria(nome);
create index if not exists idx_portaria_dtpublicacao on portaria(data_publicacao);

/*Plantão*/

create table if not exists plantao(
	codigo_escala integer not null,
	codigo integer primary key autoincrement,
	inicio integer not null, /*unix time*/
	fim integer not null, /*unix time*/
	n_magistrados integer not null,

	foreign key (codigo_escala) references escala_plantao(codigo)
		on update cascade
		on delete cascade	
);

create unique index if not exists idx_plantao_varios1 on plantao(codigo_escala, inicio, fim);


/*Designação*/

create table if not exists designacao (
	rf_juiz integer not null,
	codigo_plantao integer not null,
	codigo integer primary key autoincrement,
	data_certificacao integer, /*unix time*/
	motivo text,
	usuario_certificador integer not null,

	foreign key (codigo_plantao) references plantao(codigo)
		on update cascade
		on delete cascade,

	foreign key (rf_juiz) references juiz (rf)
		on update cascade
		on delete cascade,

	foreign key (usuario_certificador) references usuario(codigo)
		on update cascade
		on delete cascade

);

/*Proposta de troca de plantão*/
create table if not exists proposta_troca_plantao(
	rf_juiz_remetente integer not null,
	rf_juiz_destinatario integer not null,
	codigo_plantao_remetente integer not null,
	codigo_plantao_destinatario integer not null,
	codigo integer primary key autoincrement,
	texto_remetente text,
	texto_destinatario text,

	foreign key (rf_juiz_remetente) references juiz (rf)
		on update cascade
		on delete cascade,

	foreign key (rf_juiz_destinatario) references juiz (rf)
		on update cascade
		on delete cascade,

	foreign key (codigo_plantao_remetente) references plantao(codigo)
		on update cascade
		on delete cascade,
	foreign key (codigo_plantao_destinatario) references plantao(codigo)
		on update cascade
		on delete cascade

);



