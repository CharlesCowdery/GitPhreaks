import logo from './logo.svg';
import Headbar from "./modules/headbar/headbar.js"
import Gamespace from "./modules/Gamespace/Gamespace.js"
import Sidebar from "./modules/sidebar/sidebar.js"
import React, {useEffect, useState} from 'react';
import axios from 'axios'
import './App.css';

const server_url = "http://18.219.12.42:8443"


function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

var user_token = getCookie("user_token");
var user_obj = {
  "id":null,
  "username":null
}

var temp_gamedata_setter = null;
var temp_gamedata;
var temp_myState_setter = null;
var temp_myState = {
  phreaks:0,
  can_claim:false
};
var temp_change_counter = 0;
var temp_change_counter_setter;
var changecount = 0;
var queue = [];
var temp_tent_claims;
var temp_tent_claims_setter;
var [tent_type,tent_type_setter] = "";


function retrieveField(){
  axios.post(server_url+`/requestgamefield`).then(
    res=>{
      console.log("gamedata retrieved!")
      temp_gamedata_setter(res.data[1]);
      commit_time_setter(res.data[0])
      var far_date = new Date(res.data[0])
      var far_time = far_date.getTime();
      var now = new Date();
      setTimeout(()=>{retrieveMyState();retrieveField();},far_time-now.getTime())
    }
  )
}

function retrieveMyState(){
  axios.post(server_url+`/requestmystate`, {"token":user_token}).then(
    res=>{
      console.log("mystate retrieved!")
      temp_myState_setter(res.data);

    }
  )
}

function auth(){
  axios.post(server_url+`/auth`, {"token":user_token})
    .then(res => {
      var response = res.data;
      if(response == false){
        acquireToken();
      } else {
        user_obj.username = response.username;
        user_obj.id = response.id;
        console.log(user_obj);
        if(!temp_gamedata || temp_gamedata.length == 0){
          retrieveField();
          retrieveMyState();
        }
      }
    })
}

function setUsername(new_name){
  axios.post(server_url+`/setusername`, {"token":user_token,"username":new_name})
    .then(res => {
      var response = res.data;
      if(response == false){
        console.log("Failed to set username")
      }
      else {
        console.log("username set!")
      }
    })
}

function acquireToken(){
  axios.post(server_url+`/acquire`)
  .then(res => {
    user_token = parseInt(res.data);
    setCookie("user_token",user_token.toString());
    auth();
  })
}

if(user_token == null){
  acquireToken();
} else {
  user_token = parseInt(user_token);
  auth();
}

function plotcost(userState){
  var mod = userState.mining_modifier;
  var t_c = userState.tentative_claims+2;
  var c = userState.claims+100;
  var tentative = Math.max(0,Math.floor(Math.pow(t_c*Math.log10(t_c),(9+0.0025*t_c)/10)-mod))
  var current = Math.max(0,Math.floor(Math.pow(c*Math.log10(c),(9+0.0025*c)/10)-mod))
  current = (isNaN(current))?0:current;
  tentative= (isNaN(tentative))?0:tentative;
  return [current,tentative];
}

function queueClaim(x,y){
  if(!temp_tent_claims.has(x.toString()+"-"+y.toString())){
    queue.push(
      ()=>{
        return axios.post(server_url+`/queueclaim`,{token:user_token,coords:{x,y}})

      }
    )
    console.log(temp_myState)
    temp_myState.tentative_phreaks-=plotcost(temp_myState)[1];
    temp_myState.tentative_claims+=1;
    temp_myState_setter(temp_myState);
    temp_change_counter_setter(temp_change_counter+1);
    temp_tent_claims.add(x.toString()+"-"+y.toString())
    temp_tent_claims_setter(temp_tent_claims);
  }
}

function doTick(){
  axios.post(server_url+`/tick`)
  .then(res => {
    retrieveField();
    retrieveMyState();
  })
}

function changeType(tile,new_type,params){
  queue.push(
  ()=>{
      return axios.post(server_url+`/queuetype`,{token:user_token,tile,new_type,params})
    }
  )
  temp_change_counter_setter(temp_change_counter+1);
  tent_type.add(tile.position.x+"-"+tile.position.y);
  tent_type_setter(tent_type)
}

async function commit(){
  await Promise.all(queue.map(fun=>{fun()}));
  queue = [];
  temp_change_counter_setter(0);
  temp_tent_claims_setter(new Set());
  tent_type_setter(new Set());
  retrieveMyState()
  setTimeout(retrieveMyState,100);
  
}
var [commit_time,commit_time_setter] = [0,0];

function App() {
  [commit_time,commit_time_setter] = useState(new Date());
  var [current_tile,current_tile_setter] = useState(0);
  var [gamedata, gamedata_setter] = useState([]);
  var [myState,myState_setter] = useState({});
  var [change_counter,change_counter_setter] = useState(0);
  var [tent_claims,tent_claims_setter] = useState(new Set());
  [tent_type,tent_type_setter] = useState(new Set());
  temp_gamedata_setter = gamedata_setter;
  temp_gamedata = gamedata;
  temp_myState_setter = myState_setter;
  temp_myState = myState;
  temp_change_counter = change_counter;
  temp_change_counter_setter = change_counter_setter;
  temp_tent_claims = tent_claims;
  temp_tent_claims_setter = tent_claims_setter;
  return (
    <div className="App">
      <Headbar commit_time = {commit_time} ticker = {doTick}></Headbar>
      <div className = "under-container">
        <Gamespace
          gamedata = {gamedata}
          tile_setter = {current_tile_setter}
          state = {myState}
          tent_claims = {tent_claims}
          tent_type = {tent_type}
          player = {user_obj}
        ></Gamespace>
        <Sidebar
          gamedata = {gamedata}
          claimer = {queueClaim}
          state= {myState}
          player = {user_obj}
          tile = {current_tile}
          tile_setter = {current_tile_setter}
          change_counter = {change_counter}
          tent_claims = {tent_claims}
          type_changer = {changeType}
          tent_type = {tent_type}
          commiter = {commit}
        ></Sidebar>
      </div>
      
    </div>
  );
}

export default App;
