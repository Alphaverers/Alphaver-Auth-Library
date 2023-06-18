//imports
//init for dependencies
const fs = require('fs')
const express = require('express');
var bodyParser = require('body-parser');
const redis = require('redis');
const client = redis.createClient(8999);
const app = new express();
const port = 8080;
client.on('error', err => console.log('Redis Client Error', err));
//init for routes
const root = '/' //root
const revive = '/revive' //revives an auth code
const check = '/check' //checks an auth code
const token = '/token' //gets a new token
const checkuser = '/checkuser' //checks if a user is registered
const newuser = '/newuser' //registers a new user
const deluser = '/deluser' //yes
//\/ these are not implemented! \/
const getskin = '/getskin' //gets a user skin
const newskin = '/newskin' //uploads a skin (the client needs to send an URL that will lead to an image)
const delskin = '/delskin' //resets a skin to the original
//others
var currentdate = new Date(); 
var datetime = "[" + currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds() + "] ";
var jsonParser = bodyParser.json()
var MasterID = "CATCUBEMWD"
var checkvalue = "MWDCATCUBEHOUSE"
//has a delay at startup
var live = 0;
var code = "oolala";
var HeartBeat = setInterval(async function () {
    var tokens = readTokens();
    for (i = 0; i < tokens.length; i++) {    
        await client.connect()
        store(tokens[i], "ANYTHINGELSE")
        client.quit()
    }
}, 1000);
//routers

app.get(root, function (req, res) {
    logrouter(root, "GET" , req)
    res.status(200)
    res.sendFile(__dirname + "/public/root.html")
})

app.post(revive, jsonParser, function (req, res) {
    logrouter(revive, "POST")
    console.log("raw JSON: " + JSON.stringify(req.body))
    console.log("code: " + req.body.code)
    console.log("MID: " + req.body.MID)
    var check = reviver(req.body.code, req.body.MID)
    if (check == "DONE") {
        res.status(200)
        res.send({
            "token": "alive"
        })
    } else {
        res.status(400)
        res.send({
            "token": "dead"
        })
    }
})

app.get(token, jsonParser, function (req, res) {
    logrouter(token, "GET")
    console.log("raw JSON: " + JSON.stringify(req.body))
    var value = newtoken();
    if (value == "ERROR") {
        console.log("error")
        res.status(400)
        res.send({
            "token": "error" 
        })
    } else {
        console.log("done")
        res.status(400)
        res.send({
            "token": value
        })
    }
})

app.post(check, jsonParser, function (req, res) {
    logrouter(check, "POST");
    console.log("raw JSON: " + JSON.stringify(req.body))
    var check = get(req.body.code);
    if (check != null) {
        res.status(200)
        res.send({
            "token": "valid"
        })
    } else {
        res.status(400);
        res.send({
            "token": "invalid"
        })
    }
});

app.post(checkuser, jsonParser, function (req, res) {
    logrouter(checkuser, "POST")
    console.log("raw JSON: " + JSON.stringify(req.body))
    var check = checkuser(req.body.user, req.body.MID)
    if (check == "DONE") {
        res.status(200)
        res.send({
            "user": "valid"
        })
    }
})

app.post(newuser, jsonParser, function (req, res) {
    logrouter(checkuser, "POST")
    console.log("raw JSON: " + JSON.stringify(req.body))
    store(req.body.username, checkvalue)
    res.status(200)
    res.send({
        "user": "done"
    })
})

app.delete(deluser, jsonParser, function (req, res) {
    logrouter(deluser, "DELETE")
    console.log("raw JSON: " + JSON.stringify(req.body))
    del(req.body.username)
    res.status(200)
    res.send({
        "delete": "done"
    })
})

app.listen(port)
//logging functions
function logrouter(rout, method, req) {
    console.log(datetime + method + " CALL TO '" + rout + "' IP: " + req.socket.remoteAddress )
}

//token stuff
async function reviver(code, MID) {
    if (MID == MasterID) {
        await client.connect()
        console.log("reviving token: " + code)
        console.log("Master ID: " + MID)
        get(code).then(function(result){
            console.log("Current value at " + code + " : " + result)
            if (result !== checkvalue) {
                console.log("Token is dead")
                store(code, checkvalue)
                fs.writeFileSync('./tmp/token.json', JSON.stringify(code));
                return "DONE"
            } else {
                console.log("Token is already alive")
                return "DONE"
            }
        })
        client.quit()
    } else {
        console.log("Invalid MID: " + MID)
        return "ERROR"
    }
    return "ERROR"
}

async function newtoken(MID) {
    if (MID == MasterID) {
        var token = maketoken()
        writeTokens(token)
        store(token, checkvalue)
        return token
    } else {
        console.log("Invalid MID: " + MID)
        return "ERROR"
    }
    return "ERROR"
}

function maketoken() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = 8;
    let counter = 0;
    while (counter < charactersLength) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

function checkusera(user, MID) {
    if (MID = MasterID) {
        var user = get(user)
        if (user != null || user == checkvalue) {
            return "DONE";
        }
    } else {
        console.log("Invalid MID")
        return "ERROR";
    }
}

//heartbeat

function heartbeat() {
    console.log("1sec")
}

//uhgh

async function writeTokens(token) {
    fs.writeFileSync('./tmp/token.json', JSON.stringify(token))
}

async function readTokens() {
    let names = [];

    for (file of './tmp/token.json') {
        const data = JSON.parse(fs.readFileSync('./tmp/token.json'));
        names.push(data)
    }

    return names;
}

//kiss my ass redis
async function store(key, value) {
    await client.connect();
    await client.set(key, value)
    await client.quit();
}

async function get(key) {
    const value = await client.get(key)
    return value;
}

async function del(key) {
    await client.del(key)
}

//im not so sure about the map stuff so you might not wanna use em
async function storemap(key, valuelist, valuenames, values) {
    await client.hSet(key, structuremap())
}

async function getmap(key) {
    let map = await client.hGetAll(key);
    return JSON.stringify(map)
}

async function structuremap(valuenames, values) {
    var map = [];
    for (let i = 0; valuenames.length < i; i++) {
        map.push[valuenames[i] + ": " + values[i]]
    }
    return map;
}