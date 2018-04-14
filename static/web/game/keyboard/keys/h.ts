import { config, setParam } from "../../../config/config"
import { toggle } from "../tools"
import { Song } from "../../song/song"
import { IKeyboardAction } from "../i-actions"

export function h(keyboardActions: { [key: string]: IKeyboardAction }) {
    const options = [[false, false], [false, true], [true, false], [true, true]]
    const names = ["none", "right", "left", "both"]

    keyboardActions["h"] = {
        title: "Hands",
        description: "Defines which hands are played by the user [no hands / right hand / left hand / both hands].",
        triggerAction: (song: Song) => {
            setParam("p_userHands", toggle(config.p_userHands, options))
        },
        getCurrentState: () => {
            const i = options.indexOf(config.p_userHands)
            return names[i]
        }
    }
}