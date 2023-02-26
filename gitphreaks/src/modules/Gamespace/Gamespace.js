import React, {useEffect, useState} from 'react';
import './Gamespace.css';
import Tile from './Tile.js'



var temp_gamedata;
var setter_ref;

var tile_ref_function_array = [];
function constructRefArray(){
    for(let y = 0; y < 100; y ++){
        let arr = [];
        for(let x = 0; x < 100; x++){
            arr.push(()=>{
                let my_x = x;
                let my_y = y;
                setter_ref(temp_gamedata[my_y][my_x])
            })
        }
        tile_ref_function_array.push(arr);
    }
}

function Gamespace(props) {
    temp_gamedata = props.gamedata;
    if(tile_ref_function_array.length == 0 && props.gamedata.length > 0){
        constructRefArray();
    }
    setter_ref = props.tile_setter;
    var tabledata = [];
    if(tile_ref_function_array.length>0 ){
        for(let y = 0; y < temp_gamedata.length; y ++){
            let tablearr = [];
            for(let x = 0; x <temp_gamedata[0].length; x++){
                let entry = props.gamedata[y][x];
                let claimed_class = "";
                if(props.state.tentative_pos){
                    if(props.state.tentative_pos[y][x]){
                        claimed_class = "tent-claim";
                    }
                }
                if(props.tent_claims.has(x+"-"+y)){
                    claimed_class="tent-claim no-commit"
                }
                if(props.tent_type.has(x+"-"+y)){
                    claimed_class="tent-claim no-commit-type"
                }
                tablearr.push((
                    <td className = {entry.type+" "+claimed_class} key = {y+"-"+x}
                        onMouseUp = {tile_ref_function_array[y][x]}
                        style = {{backgroundColor:entry.color}}
                    >
                        <div className = "tile-obscurer"></div>
                    </td>
                ))
            }
            tabledata.push((<tr key = {y+"-row"}>{tablearr}</tr>))
        }
    }

    return (
        <div className="gamespace">
            <table className = "game-table">
                <tbody>
                    {tabledata}
                </tbody>
            </table>
        </div>
    );
}

export default Gamespace;
