import React, {useEffect, useState} from 'react';
import "./sidebar.css"
import {TileData} from "../Gamespace/Gamespace.js"
import commit_icon from "./commit.png"

function abbreviateNumber(value) {
    var newValue = value;
    if (value >= 1000) {
        var suffixes = ["", "k", "m", "b","t"];
        var suffixNum = Math.floor( (""+value).length/3 );
        var shortValue = '';
        for (var precision = 4; precision >= 1; precision--) {
            shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
            var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
            if (dotLessShortValue.length <= 4) { break; }
        }
        if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(3);
        newValue = shortValue+suffixes[suffixNum];
    }
    return newValue;
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

function Sidebar(props) {


    var tile = props.tile

    //if(tile.owner == )
    var tile_info;
    if(tile){
        tile_info = (
            <div className = "tile-info-box">
                <h4>Tile data</h4>
                <p>{`Position: (${tile.position.x}, ${tile.position.y})`}</p>
                <p>{`Type: ${tile.type}`}</p>
                {(tile.owner!=null)?<p>{`Owner: ${tile.owner.username}`}</p>:""}
                {(tile.type == "script")?<p>{`Script: ${tile.script}`}</p>:""}
                {(tile.type == "defender")?<p>{`Power: ${tile.power}`}</p>:""}
                {(tile.link!="")?<a target="_blank" href={tile.link}>repo location</a>:""}
            </div>
        )
    } else {
        tile_info = <div className = "tile-info-box"></div>
    }

    var control_panel;
    if(tile.owner!=null){
        if(tile.owner.id == props.player.id){
            control_panel = (
                <div className = "tile-control-container">
                    <h4>Controls</h4>
                    <div>
                        <span>type:</span>
                        <select className = "control-dropdown" value = {tile.type} onChange={
                            (v)=>{
                                props.type_changer(tile,v.target.value,{power:0,script:""})
                                tile.type = v.target.value;
                                props.tile_setter(tile);
                            }
                            }>
                            <option value = "generator">Generator</option>
                            <option value = "defender">Defender</option>
                            <option value = "miner">Miner</option>
                            <option value = "script">Script</option>
                        </select>
                    </div>
                    {(tile.type == "script")?(<div>
                        <span>script:</span>
                        <select className = "control-dropdown">
                            <option>cock.js</option>
                            <option>balls.js</option>
                        </select>
                    </div>):""}
                    {(true||tile.type == "defender")?(<div>
                        <span>Power:</span>
                        <input type="number" defaultValue = {1} min = {0} className = "control-input"></input>
                    </div>):""}
                </div>
            )
        }
    } else {
        var button_valid =  true;
        if(props.tile != 0){
            var tile_cor = tile.position.x.toString()+"-"+tile.position.y.toString();
            button_valid =  button_valid && (props.state.tentative_phreaks>=plotcost(props.state)[1])
            button_valid =  button_valid && !props.tent_claims.has(tile_cor);
            button_valid =  button_valid && !props.state.tentative_pos[tile.position.y][tile.position.x]
            var has_neighbor = false;
            for(var ry = -1; ry < 2; ry++){
                for(var rx = -1; rx < 2; rx++){
                    if(!(ry==0&&rx==0)){
                        var ny = tile.position.y+ry;
                        var nx = tile.position.x+rx;
                        if(ny>=0 && ny<props.gamedata.length){
                            if(nx>=0 && nx<props.gamedata.length){
                                var n_tile = props.gamedata[ny][nx]
                                if(n_tile.owner != null && n_tile.owner.id == props.player.id){
                                    has_neighbor = true;
                                }
                            }
                        }
                    }
                }
            }
            if(props.state.claims != 0){
                button_valid = button_valid & has_neighbor;
            }
                            
        } else {
            button_valid = false;
        }
        control_panel = (
            <div className = {`tile-button ${(!button_valid)?"inactive":""}`}
                onMouseDown = {()=>{props.claimer(tile.position.x,tile.position.y)}}
            >
                CLAIM
            </div>
        )
    }

    return (
        <div className="Sidebar">
            <div className = "player-panel">
                <h4>Your info</h4>
                <p>You have {abbreviateNumber(props.state.phreaks)} Phreaks</p>
                <h5>You have {props.state.claims} claim{(props.state.claims!=1)?"s":""}</h5>
                <h5>You have {props.state.tentative_claims-props.state.claims} queued claim{(props.state.tentative_claims!=1)?"s":""}</h5>                
                <h5>Claims cost {abbreviateNumber(plotcost(props.state)[1])} Phreaks</h5>
                <h5>Your minining modifier is {abbreviateNumber(props.state.mining_modifier)}</h5>
            </div>
            {tile_info}
            <div className = "tile-control-box">
                {control_panel}
            </div>
            <div className = "commit-box">
                <div className = "commit-button" onMouseDown = {props.commiter}>
                    COMMIT
                </div>
                <div className = "commit-info-box">
                    <img src={commit_icon}></img><span>{props.change_counter}</span>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
