'use strict'
const express = require('express')
const cors = require('cors')
const http = require('http')
const router = require('./controller/router')
const bodyParser = require('body-parser')


const app = express()
const PORT = 3000;
app.use(cors())
app.use(bodyParser.urlencoded({extended : false}))

const server = http.createServer(app)

app.use(router)

const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`Current server time: ${now.toLocaleString()} Time Zone: ${timeZone}`);

server.listen(PORT, ()=>{
    console.log(`Server runing in port ${PORT}`);
})
