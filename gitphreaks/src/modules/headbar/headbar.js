import React, {useEffect, useState, useRef} from 'react';
import './headbar.css';

//var time_set = ()=>{};
var time_ref = 0;
var target_time = new Date();

setInterval(()=>{
    var date = new Date()
    var delta = new Date(target_time.getTime()+5*60*1000-date.getTime())
    var minutes = delta.getMinutes().toString();
    var seconds = delta.getSeconds().toString();
    var millis = delta.getMilliseconds().toString();
    if(seconds.length < 2){
        seconds = "0"+seconds;
    }
    if(millis.length == 2){
        millis = "0"+millis[0];
    }
    if(millis.length > 2){
        millis = millis.substring(0,2)
    }
    if(millis.length == 1){
        millis = "00"
    }
    time_ref.current.innerHTML = (`${minutes}:${seconds}.${millis}`)
},4)

function Headbar(props) {
    time_ref = useRef(0)
    //var commit_time = 
    //time_set = time_setter;
    target_time = props.commit_time;
  return (
    <div className="headbar">
        <div className = "timer" ref = {time_ref}>
            0
        </div>
        <div className = "follower-container">
            <div className = "timer-follower">
                UNTIL REPO PUSH
            </div>
        </div>
       <div className = "ticker" onMouseDown={props.ticker}>
         TICK!
       </div>
    </div>
  );
}

export default Headbar;
