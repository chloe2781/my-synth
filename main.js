// var audioCtx;
// const playButton = document.querySelector('button');

// playButton.addEventListener('click', function() {
//     if (!audioCtx) {
//         audioCtx = new (window.AudioContext || window.webkitAudioContext);
//         let osc = audioCtx.createOscillator();
//         // osc.connect(audioCtx.destination);
//         osc.start();
//     }
// });

document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const globalGain = audioCtx.createGain();
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    globalGain.connect(audioCtx.destination);

    const wavePicker = document.querySelector("select[name='waveform']");

    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096,  //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910,  //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398,  //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138,  //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916,  //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192,  //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821,  //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797,  //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277,  //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832,  //7 - A#
        '85': 987.766602512248223,  //U - B
        '73': 1046.502261202394538, //I - C
    }

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    activeOscillators = {}
    activeGainNodes = {}

    

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            // if there's more than one note played at a time, the gain is divided by the number of notes
            // this is so that the sound doesn't get too loud
            const activeOscillatorsCount = Object.keys(activeOscillators).length;
            const gain = 0.8 / (activeOscillatorsCount+1);
            console.log(gain);
            if (activeOscillatorsCount > 0) {
                for (const activeOscillator in activeOscillators) {
                    activeGainNodes[activeOscillator].gain.setTargetAtTime(gain, audioCtx.currentTime, 1);
                }
            }
            playNote(key, gain);
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            activeGainNodes[key].gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
            activeOscillators[key].stop(audioCtx.currentTime + 0.2);
            // activeOscillators[key].stop();
            delete activeOscillators[key];
            delete activeGainNodes[key];
        }
    }

    function playNote(key, gainVal) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)
        osc.type = wavePicker.value //choose your favorite waveform'
        osc.connect(gainNode).connect(globalGain)
        activeOscillators[key] = osc
        activeGainNodes[key] = gainNode
        osc.start();
        gainNode.gain.setTargetAtTime(gainVal, audioCtx.currentTime, 0.01)

        const noteName = getNoteName(key);
        const noteDisplay = document.getElementById('note-display');
        const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        noteDisplay.textContent = noteName;
        noteDisplay.style.color = randomColor;
    }

    function getNoteName(key) {
        const noteNames = {
            '90': 'C',  //Z - C
            '83': 'C#',  //S - C#
            '88': 'D',  //X - D
            '68': 'D#',  //D - D#
            '67': 'E',  //C - E
            '86': 'F',  //V - F
            '71': 'F#',  //G - F#
            '66': 'G',  //B - G
            '72': 'G#',  //H - G#
            '78': 'A',  //N - A
            '74': 'A#',  //J - A#
            '77': 'B',  //M - B
            '81': 'C',  //Q - C
            '50': 'C#',  //2 - C#
            '87': 'D',  //W - D
            '51': 'D#',  //3 - D#
            '69': 'E',  //E - E
            '82': 'F',  //R - F
            '53': 'F#',  //5 - F#
            '84': 'G',  //T - G
            '54': 'G#',  //6 - G#
            '89': 'A',  //Y - A
            '55': 'A#',  //7 - A#
            '85': 'B',  //U - B
            '73': 'C', //I - C
        }
        return noteNames[key];
    }

});