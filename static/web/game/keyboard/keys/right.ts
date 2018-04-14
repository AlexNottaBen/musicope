import { config, setParam } from "../../../config/config"
import { Song } from "../../song/song"
import { IKeyboardAction } from "../i-actions"

export function right(keyboardActions: { [key: string]: IKeyboardAction }) {
    keyboardActions["right"] = {
        title: "Fast forward",
        description: "Fast forward the song by the amount of 2 beats.",
        triggerAction: (song: Song) => {
            var keys = Object.keys(song.midi.signatures).sort((a, b) => Number(b) - Number(a))
            var fkeys = keys.filter((s) => { return Number(s) < (config.p_elapsedTime || 0) + 10 })
            var key = Number(fkeys.length == 0 ? keys[keys.length - 1] : fkeys[0])
            var n = ((config.p_elapsedTime || 0) - key) / song.midi.signatures[key].msecsPerBar
            var newTime = key + Math.ceil(n + 0.5) * song.midi.signatures[key].msecsPerBar
            var truncTime = Math.min(song.timePerSong + 10, newTime)
            setParam("p_elapsedTime", truncTime)
        },
        getCurrentState: () => {
            return (config.p_elapsedTime || 0) / 1000
        }
    }
}