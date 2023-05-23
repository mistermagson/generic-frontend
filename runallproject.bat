set theDir=%cd%
set backendnode="%theDir%\backend\webapi"
set genericfrontend="%theDir%\genericfrontend"
set genericdata="%theDir%\genericdata"
set jsoneditor="%theDir%\jsoneditor"
cd %backendnode%
start node --inspect plantaowebapi.js
cd %genericfrontend%
start node plantaomiddleware.js
start node loginSmart.js
rem cd %genericdata%
rem start node app.js
cd %jsoneditor%
start node app.js
cd %theDir%