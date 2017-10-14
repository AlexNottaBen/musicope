﻿import * as $ from 'jquery'

import { config, subscribe } from "../../config/config";
import { Song } from "../song/song";

import { WebGL } from "./webgl";
import { drawScene } from "./draw-scene";
import { hexToRgb, IDrawRect } from "./utils";

function concat(arrays: Float32Array[]) {
    var result = (() => {
        var length = 0;
        arrays.forEach((a) => { length += a.length; });
        return new Float32Array(length);
    })();
    var pos = 0;
    arrays.forEach((a) => {
        result.set(a, pos);
        pos += a.length;
    });
    return result;
}

export class Scene {

    private activeIds = new Int32Array(127);
    private pixelsPerTime: number;

    private canvas: HTMLCanvasElement;
    private webgl: WebGL;

    private latestID = [0, 0];
    private ids = [[], []];

    public constructor(private song: Song) {
        var o = this;
        o.subscribeToParamsChange();
        o.canvas = <any>$(".canvas")[0];
        o.setCanvasDim();
        o.setupWebGL();
        o.setupScene();
        o.setupHandsVisibility();
    }

    public setPianoActiveId(id: number) {
        this.activeIds[id] = 1;
    }

    public unsetPianoActiveId(id: number) {
        this.activeIds[id] = 0;
    }

    public reset() {
        var o = this;
        for (var i = 21; i < o.activeIds.length; i++) {
            o.activeIds[i] = 0;
        }
        o.latestID = [-1, -1];
        o.ids = [[], []];
    }

    public redraw(time: number, isPaused: boolean) {
        var o = this;
        var dx = 2 * time / o.song.timePerSong;
        var dy = -time * o.pixelsPerTime / o.canvas.height * 2;
        var dy2 = Math.ceil(dy / 1.1) * 1.1;
        //console.log(dy, dy2);
        o.webgl.redraw(dx, dy, o.activeIds);
    }

    public addUID(uid: number, handID: number) {
        var o = this;
        if (o.latestID[handID] === -1) {
            o.latestID[handID] = uid - 1;
        }
        if (uid === o.latestID[handID] + 1) {
            o.latestID[handID] = o.latestID[handID] + 1;
            while (o.ids[handID].length > 0 && o.ids[handID][0] === o.latestID[handID] + 1) {
                o.latestID[handID] = o.latestID[handID] + 1;
                o.ids[handID].shift();
            }
        } else if (uid > o.latestID[handID] + 1) {
            o.ids[handID].push(uid);
            o.ids[handID] = o.ids[handID].sort();
        } else {
            throw "addUID";
        }
        if (o.ids[handID].length > 9) {
            throw "addUID2";
        }
        var offset = handID * 10;
        o.activeIds[offset] = o.latestID[handID];
        for (var i = 1; i < 10; i++) {
            o.activeIds[offset + i] = o.ids[handID][i - 1] || 0;
        }
    }

    private subscribeToParamsChange = () => {
        var o = this;
        subscribe("scene.Basic", "^s_noteCoverRelHeight$", (name, value) => {
            o.setupScene();
        });
        subscribe("scene-userhands", "^p_userHands$", (name, value) => {
            o.setupHandsVisibility();
        });
    }

    private setupHandsVisibility = () => {
        var o = this;
        o.activeIds[0] = config.p_userHands[0] ? 0 : 90000;
        o.activeIds[10] = config.p_userHands[1] ? 0 : 90000;
    }

    private setCanvasDim() {
        var o = this;
        o.canvas.width = window.innerWidth;
        o.canvas.height = window.innerHeight;
        o.pixelsPerTime = o.canvas.height / (config.s_quartersPerHeight * o.song.midi.signatures[0].msecsPerBeat);
    }

    private setupWebGL() {
        var o = this;
        var attributes = [
            { name: "a_position", dim: 2 },
            { name: "a_color", dim: 4 },
            { name: "a_id", dim: 1 },
            { name: "a_activeColor", dim: 4 }
        ];
        o.webgl = new WebGL(o.canvas, attributes);
    }

    private setupScene() {
        var o = this;
        var bag: Float32Array[] = [];

        function drawRect(x0, y0, x1, y1, ids, color, activeColor) {
            bag.push(o.rect(x0, y0, x1, y1, ids, [color], [activeColor]));
        }

        drawScene(drawRect, o.canvas.width, o.canvas.height, o.pixelsPerTime, o.song.sceneTracks, o.song.playedNoteID.min, o.song.playedNoteID.max, o.song.midi.signatures, o.song.sceneSustainNotes);

        var bufferData = concat(bag);
        o.webgl.setBuffer(bufferData);
    }

    private rect(x0: number, y0: number, x1: number, y1: number, ids: number[], colors: number[][], activeColors: number[][]) {
        var o = this;
        function fx(v: number) { return v / o.canvas.width * 2 - 1; }
        function fy(v: number) { return v / o.canvas.height * 2 - 1; }
        if (colors.length === 1) { colors = [colors[0], colors[0], colors[0], colors[0]]; }
        if (!activeColors) { activeColors = colors; }
        else if (activeColors.length === 1) { activeColors = [activeColors[0], activeColors[0], activeColors[0], activeColors[0]]; }
        if (ids.length === 1) { ids = [ids[0], ids[0], ids[0], ids[0]]; }
        var out = new Float32Array(
            [fx(x0), fy(y0), colors[0][0], colors[0][1], colors[0][2], colors[0][3], ids[0], activeColors[0][0], activeColors[0][1], activeColors[0][2], activeColors[0][3],
            fx(x1), fy(y0), colors[1][0], colors[1][1], colors[1][2], colors[1][3], ids[1], activeColors[1][0], activeColors[1][1], activeColors[1][2], activeColors[1][3],
            fx(x1), fy(y1), colors[2][0], colors[2][1], colors[2][2], colors[2][3], ids[2], activeColors[2][0], activeColors[2][1], activeColors[2][2], activeColors[2][3],
            fx(x0), fy(y0), colors[0][0], colors[0][1], colors[0][2], colors[0][3], ids[0], activeColors[0][0], activeColors[0][1], activeColors[0][2], activeColors[0][3],
            fx(x1), fy(y1), colors[2][0], colors[2][1], colors[2][2], colors[2][3], ids[2], activeColors[2][0], activeColors[2][1], activeColors[2][2], activeColors[2][3],
            fx(x0), fy(y1), colors[3][0], colors[3][1], colors[3][2], colors[3][3], ids[3], activeColors[3][0], activeColors[3][1], activeColors[3][2], activeColors[3][3]]);
        return out;
    }

}