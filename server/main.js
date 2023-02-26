const express = require('express')
const https = require("https")
const app = express()
const fs = require("fs")
var cors = require('cors')
var bodyParser = require('body-parser')
var cookieParser = require("cookie-parser")
const { exec,spawn } = require('node:child_process')


const simpleGit = require('simple-git');
simpleGit().clean(simpleGit.CleanOptions.FORCE);

const git = simpleGit('../GitPhreaks', { binary: 'git' });

const timer_duration = 15*1000;

//app.use(cors)
app.use(cookieParser())
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
})


const port = 8443

https.createServer(
		// Provide the private and public key to the server by reading each
		// file's content with the readFileSync() method.
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    app
  ).listen(port, ()=>{
    console.log('server is runing at port 8443')
  })


var ids = new Set();

function writeWorldToGit(field_data,state,users){
    const directory = "../GitPhreaks/Game-World"
    field_data.forEach((row,y)=>{
        var y_string = y.toString();
        if(y_string.length==1)y_string = "0"+y_string;
        var row_path = `${directory}/row-${y_string}`;
        if(!fs.existsSync(row_path)){
            fs.mkdirSync(row_path)
        }
        row.forEach((entry,x)=>{
            var datatext = 
            
`owner id:   ${entry.owner?.id ?? "none"}
owner name: ${entry.owner?.username ?? "none"}
cell type:  ${entry.type}
cell power: ${entry.power}
cell color: ${entry.color}
script name:${entry.script}
`
            fs.writeFileSync(`${row_path}/cell-${x}`,datatext,"utf-8");
        })
    })
    if(!fs.existsSync(directory+"/state")){
        fs.mkdirSync(directory+"/state")
    }
    for(let token in users){
        var user = users[token];
        if(user.id){
            var path = directory+"/state/"+user.id
            if(!fs.existsSync(path)){
                fs.mkdirSync(path);
            }
            if(!fs.existsSync(path+"/scripts")){
                fs.mkdirSync(path+"/scripts");
            }
            fs.writeFileSync(path+"/scripts/placeholder.txt","no magic here","utf-8")
            var user_state = gameState.userStates[user.id];
            if(user_state){
                var claims = user_state.claims
                var phreaks = user_state.phreaks
                var modifier = user_state.mining_modifier
                var output_string = 
`id:${user.id}
username:${user.username}
claims:${claims}
phreaks:${phreaks}
modifier:${modifier}
`
            } else {
                var output_string = `id:${user.id}\nusername:${user.username}`
            }
            fs.writeFileSync(path+"/user.txt",output_string,"utf-8");
        }
    }

    git.init().add("Game-World/*/*").commit("auto commit").push();
}

function save(doFull){
    console.log("saving!...")
    fs.writeFileSync("./users.json",JSON.stringify(users),"utf-8");
    fs.writeFileSync("./fieldData.json",JSON.stringify(fieldData),"utf-8")
    fs.writeFileSync("./gameState.json",JSON.stringify(gameState),"utf-8")
    if(doFull)writeWorldToGit(fieldData,gameState,users);
    console.log("done!");
}

var field_x = 50
var field_y = 50

var fieldData = [];

var gameState = null;



var actionqueue = [];
for(let i = 0; i < field_y; i ++)actionqueue.push([]);
actionqueue = actionqueue.map(row=>{
    var arr = []
    for(let i = 0; i < field_x; i ++){
        arr.push([]);
    }
    return arr;
})
try{
    fieldData = JSON.parse(fs.readFileSync("fieldData.json"))
} catch(e){
    console.log("no field data found")
}

var users = {};
try{
    var users = JSON.parse(fs.readFileSync("./users.json","utf-8"));
} catch(e){
    console.log("no user data found")
}

try{
    var gameState = JSON.parse(fs.readFileSync("./gameState.json","utf-8"));
} catch(e){
    console.log("no game state found")
}


var pushTime 

function newGameField(){
    fieldData = [];
    gameState = {};
    for(let y = 0; y < field_y; y++){
      let datarow = [];
      for(let x = 0; x < field_x; x++){
        datarow.push(
          {
            position:{x,y},
            owner:null,
            color:"#555b",
            type:"unclaimed",
            link:"",
            script:"",
            power:0
          }
        )
      }
      fieldData.push(datarow);
    }
    gameState = {
        userStates:{}
    }
}

if(fieldData.length == 0 || gameState == null){
    console.log("generating new game field")
    newGameField();
    save();
}

function verify(req){
    if(req.body.token){
        if(req.body.token in users){
            return true;
        }
    }
    return false;
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function plotcost(userState){
    var mod = userState.mining_modifier;
    var t_c = userState.tentative_claims;
    var c = userState.claims;
    var tentative = Math.max(0,Math.floor(Math.pow(t_c*Math.log10(t_c),(9+0.0025*t_c)/10)-mod))
    var current = Math.max(0,Math.floor(Math.pow(c*Math.log10(c),(9+0.0025*c)/10)-mod))
    current = (isNaN(current))?0:current;
    tentative= (isNaN(tentative))?0:tentative;
    return [current,tentative];
}

function doTick(){
    console.log("ticking!")
    var start = new Date();
    for(let y = 0; y < field_y; y++){
        for(let x = 0; x < field_x; x++){
            var tile = fieldData[y][x]
            switch(tile.type){
                case "generator":
                    gameState.userStates[tile.owner.id].phreaks+=5;
                    break;
                case "miner":
                    gameState.userStates[tile.owner.id].mining_modifier+=1;
                    gameState.userStates[tile.owner.id].phreaks-=1;
                    break;
                case "unclaimed":
                    break;
                default:
                    gameState.userStates[tile.owner.id].phreaks+=2;
                    break;
            }
            var actions = actionqueue[y][x];
            for(let i = 0; i < actions.length;i++){
                let action = actions[i];
                let type = action.action;
                switch(type){
                    case "claim":
                        fieldData[y][x].owner = action.owner;
                        fieldData[y][x].color = action.color;
                        fieldData[y][x].type = "generator"
                        var owner_id = action.owner.id;
                        gameState.userStates[owner_id].phreaks-=plotcost(gameState.userStates[owner_id])[0];
                        gameState.userStates[owner_id].claims++;
                        break;
                    case "set-type":
                        fieldData[y][x].type = action.new_type,
                        fieldData[y][x].power = action.power,
                        fieldData[y][x].script = action.script
                        break;
                }
            }
            actionqueue[y][x] = [];
            
        }
    }
    for(let user_id in gameState.userStates){
        gameState.userStates[user_id].tentative_phreaks = gameState.userStates[user_id].phreaks;
        gameState.userStates[user_id].tentative_claims = gameState.userStates[user_id].claims;
    }
    save(true);
    var end = new Date();
    console.log("done ticking! took", (end.getTime()-start.getTime())/1000+"s!")
    var now = new Date();
    pushTime = new Date(now.getTime()+timer_duration)
    setTimeout(doTick,timer_duration+2000);
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post("/tick",(req,res)=>{
    doTick();
    res.send("done");
})

app.post("/queueclaim",(req,res)=>{
    if(verify(req)){
        console.log("attempting claim")
        var user = users[req.body.token];
        var tentative_cost = plotcost(gameState.userStates[user.id])[1];
        if(tentative_cost <= gameState.userStates[user.id].tentative_phreaks){
            gameState.userStates[user.id].tentative_phreaks-=tentative_cost;
            var coords = req.body.coords;
            actionqueue[coords.y][coords.x].push({
                action:"claim",
                owner:{id:user.id,username:user.username},
                color:user.color
            })
            gameState.userStates[user.id].tentative_pos[coords.y][coords.x] = true;
            gameState.userStates[user.id].tentative_claims++;
            console.log("claim occured")
            res.send(true);
            return;
        }
    }
    res.send(false);
})

app.post("/queuetype",(req,res)=>{
    if(verify(req)){
        var user =  users[req.body.token];
        var target = req.body.tile;
        var params = req.body.params
        var new_type = req.body.new_type;
        if(target.owner.id == user.id){
            actionqueue[target.position.y][target.position.x].push({
                action:"set-type",
                new_type:new_type,
                power:params.power,
                script:params.script
            })
        }
        res.send(true)
        return;
    }
    res.send(false)
})

app.post("/requestgamefield", (req,res)=>{
    res.send(
        JSON.stringify(
                [pushTime,fieldData]
            )
        )
})

app.post("/requestmystate", (req,res)=>{
    if(verify(req)){
        var user = users[req.body.token]
        res.send(JSON.stringify(gameState.userStates[user.id]))
    }
})

app.post("/setusername", (req,res)=>{
    if(verify(req)){
        var profile = users[req.body.token]
        console.log("changing the username of user "+profile.id+" from "+profile.username+" to "+req.body.username);
        users[req.body.token].username = req.body.username;
        save();
    }
})

app.post("/acquire", (req,res)=>{
    console.log("acquiring token")
    var token = Math.round(Math.random()*Number.MAX_SAFE_INTEGER);
    while(token in users){
        token = Math.round(Math.random()*Number.MAX_SAFE_INTEGER);
    }
    var id = Math.round(Math.random()*Number.MAX_SAFE_INTEGER);
    while(ids.has(id)){
        id = Math.round(Math.random()*Number.MAX_SAFE_INTEGER);
    }
    var username = "A-"+id%10000
    users[token] = {username:username,id:id,color:hslToHex(Math.floor(Math.random()*360),100,Math.random()*20+40)};
    ids.add(id);
    save();
    res.send(JSON.stringify(token))
})

app.post("/auth", (req,res)=>{
    try{
        var token = req.body.token;
        if(verify(req)){
            var user = users[token];
            var id = user.id
            var username = user.username
            res.send({
                id,
                username
                });
            console.log("user auth sucess, logging in user "+id+ ` (${username})`)
            if(!(id in gameState.userStates)){
                console.log("user new to game, adding to players")
                gameState.userStates[id] = {
                    phreaks: 0,
                    tentative_phreaks: 0,
                    claims: 0,
                    tentative_claims:0,
                    mining_modifier:0,
                    generators:0,
                    tentative_pos:[],
                    scripts:{}
                }
                for(let i = 0; i < field_y; i++){
                    gameState.userStates[id].tentative_pos.push([]);
                    for(let k = 0; k < field_y; k++){
                        gameState.userStates[id].tentative_pos[i].push(false)
                    }
                } 
                save();
            }
        } else {
            res.send(false);
            console.log("user auth failed")
        }
    } catch (e ){
        console.log(e)
    }
})
/*
app.listen(port, () => {
  console.log(`phreaker server listening on port ${port}`)
  
})*/

var now = new Date();
  pushTime = new Date(now.getTime()-5*60*1000+timer_duration)
  setTimeout(doTick,timer_duration);