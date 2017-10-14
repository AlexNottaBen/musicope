import { hexToRgb, IDrawRect } from "./utils";
import { whiteNoteIds, blackNoteIds, blackNoteSpots } from "./note-ids";
import { ISignature } from "../midi-parser/i-midi-parser";

var octaveLineColor = hexToRgb("#808080");
var leftTrackWhiteNoteBackgroundColor = hexToRgb("#ffffff");
var leftTrackBlackNoteBackgroundColor = hexToRgb("#ffffff");
var tooLateZoneColor = hexToRgb("#ffffff");
var barLineColor = hexToRgb("#808080");
var notePlayedColor = hexToRgb("#ffffff", 0.15);
var notePlayedColor2 = hexToRgb("#ffffff", 0.001);
var sustainColor = hexToRgb("#00ff90");

var colors = [
    "#FA0B0C",
	"#F44712",
	"#F88010",
	"#F5D23B",
	"#B5B502",
	"#149033",
	"#1B9081",
	"#7D6AFD",
	"#A840FD",
	"#7F087C",
	"#fc028b",
	"#D71386"
].map(hexToRgb);

var leftTrackColorPadding = blackKeyWidth => Math.ceil(0.15 * blackKeyWidth);
var tooLateZoneWidth = pianoHeight => Math.ceil(0.01 * pianoHeight);

function drawBlackNote(drawRect: IDrawRect, noteID: number, noteUID: number, isLeftTrack: boolean, whiteKeyWidth: number, blackKeyWidth: number, y0: number, y1: number, color: number[]) {
    var pos = blackNoteIds.indexOf(noteID);
    if (pos >= 0) {
        var x0 = blackNoteSpots[pos] * whiteKeyWidth - blackKeyWidth / 2;
        var x1 = x0 + blackKeyWidth;
        if (isLeftTrack) {
            let padding = leftTrackColorPadding(blackKeyWidth);
            drawRect(x0, y0, x1, y1, [100000 + noteUID], leftTrackBlackNoteBackgroundColor, notePlayedColor);
            drawRect(x0 + padding, y0, x1 - padding, y1, [100000 + noteUID], color, notePlayedColor2);
        } else {
            drawRect(x0, y0, x1, y1, [200000 + noteUID], color, notePlayedColor);
        }
    }
}

function drawWhiteNote(drawRect: IDrawRect, noteID: number, noteUID: number, isLeftTrack: boolean, whiteKeyWidth: number, blackKeyWidth: number, y0: number, y1: number, color: number[]) {
    var ipos = whiteNoteIds.indexOf(noteID);
    if (ipos >= 0) {
        var x0 = ipos * whiteKeyWidth + 2;
        var x1 = x0 + whiteKeyWidth - 2 * 2;
        if (isLeftTrack) {
            let padding = leftTrackColorPadding(whiteKeyWidth);
            drawRect(x0, y0, x1, y1, [100000 + noteUID], leftTrackWhiteNoteBackgroundColor, notePlayedColor);
            drawRect(x0 + padding, y0, x1 - padding, y1, [100000 + noteUID], color, notePlayedColor2);
        } else {
            drawRect(x0, y0, x1, y1, [200000 + noteUID], color, notePlayedColor);
        }
    }
}

function iterateNotes(drawRect: IDrawRect, whiteKeyWidth: number, blackKeyWidth: number, tracks: any[][], start_y: number, pixelsPerTime: number, drawNote) {
    tracks.forEach((track, trackID) => {
        track.forEach(function (note) {
            var y0 = start_y + pixelsPerTime * note.timeOn + 2;
            var y1 = start_y + pixelsPerTime * note.timeOff - 2;
            if (y1 - y0 < 5) {
                y1 = y0 + 5;
            }
            var color = colors[note.id % 12];
            drawNote(drawRect, note.id, note.uid, trackID === 0, whiteKeyWidth, blackKeyWidth, y0, y1, color);
        });
    });
}

function drawBarLines(drawRect: IDrawRect, tracks: any[][], pixelsPerTime: number, whiteKeyWidth: number, start_y: number, signatures: { [msecs: number]: ISignature }) {
    var maxTime = 0;
    tracks.forEach((t) => {
        if (t.length > 0) {
            maxTime = Math.max(t[t.length - 1].timeOff, maxTime);
        }
    });

    var keys = Object.keys(signatures).sort((a, b) => Number(a) - Number(b));
    keys.forEach((key, i) => {
        var startTime = Number(key);
        if (i + 1 < keys.length) {
            var endTime = Number(keys[i + 1]);
            var step = signatures[startTime].msecsPerBeat;
            var n = Math.round((endTime - startTime) / step);
            var newStep = (endTime - startTime) / n;
            for (var j = (i == 0 ? -2 : 0); j < n; j++) {
                var time = startTime + j * newStep;
                var y = start_y + pixelsPerTime * time;
                var x1 = (whiteNoteIds.length + 1) * whiteKeyWidth;
                if (j == 0) {
                    drawRect(0, y - 2, x1, y + 2, [200], barLineColor, barLineColor);
                } else {
                    drawRect(0, y, x1, y + 1, [200], barLineColor, barLineColor);
                }
            }
        } else {
            var step = signatures[startTime].msecsPerBeat;
            var n = Math.ceil((maxTime - startTime) / step);
            for (var j = 0; j < n; j++) {
                var time = startTime + j * step;
                var y = start_y + pixelsPerTime * time;
                var x1 = (whiteNoteIds.length + 1) * whiteKeyWidth;
                drawRect(0, y, x1, y + 1, [200], barLineColor, barLineColor);
            }
        }
    });
}

function drawOctaveLines(drawRect: IDrawRect, whiteKeyWidth: number, pianoHeight: number, sceneHeight: number) {
    whiteNoteIds.forEach((id, i) => {
        if (id % 12 == 0) {
            var x0 = i * whiteKeyWidth;
            drawRect(x0, pianoHeight, x0 + 1, sceneHeight, [id], octaveLineColor, octaveLineColor);
        }
    });
}

function drawTooLateZone(drawRect: IDrawRect, pianoHeight: number, pianoWidth: number, start_y: number) {
    drawRect(0, start_y - tooLateZoneWidth(pianoHeight), pianoWidth, start_y, [11], tooLateZoneColor, tooLateZoneColor);
}

function labelNotes(tracks: any[][]) {
    tracks.forEach((track) => {
        var sorted = track.sort((a, b) => a.timeOn - b.timeOn);
        sorted.forEach((note, i) => note.uid = i + 1);
    });
}

function drawSustainNotes(drawRect: IDrawRect, sustainNotes: any[], start_y: number, pixelsPerTime: number, whiteKeyWidth: number) {
    sustainNotes.forEach((note) => {
        var y0 = start_y + pixelsPerTime * note.timeOn + 1;
        var y1 = start_y + pixelsPerTime * note.timeOff - 2;
        var ipos = whiteNoteIds.length;
        var x0 = ipos * whiteKeyWidth + 3;
        var x1 = x0 + whiteKeyWidth - 5;
        drawRect(x0, y0, x1, y1, [200], sustainColor, sustainColor);
    });
}

export function drawBarzone(drawRect: IDrawRect, whiteKeyWidth: number, blackKeyWidth: number, sceneHeight: number, tracks: any[][], start_y: number, pixelsPerTime: number, pianoHeight: number, pianoWidth: number, signatures: { [msecs: number]: ISignature }, sustainNotes: any[]) {
    labelNotes(tracks);
    drawOctaveLines(drawRect, whiteKeyWidth, pianoHeight, sceneHeight);
    drawBarLines(drawRect, tracks, pixelsPerTime, whiteKeyWidth, start_y, signatures);
    drawSustainNotes(drawRect, sustainNotes, start_y, pixelsPerTime, whiteKeyWidth);
    iterateNotes(drawRect, whiteKeyWidth, blackKeyWidth, tracks, start_y, pixelsPerTime, drawWhiteNote);
    iterateNotes(drawRect, whiteKeyWidth, blackKeyWidth, tracks, start_y, pixelsPerTime, drawBlackNote);
   // drawTooLateZone(drawRect, pianoHeight, pianoWidth, start_y);
}