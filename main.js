document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // const globalGain = audioCtx.createGain();
    // globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    // globalGain.connect(audioCtx.destination);

    const wavePicker = document.querySelector("select[name='waveform']");
    const audioSynth = document.querySelector("select[name='synthesis']");
    const volumeControl = document.querySelector("input[name='volume']");

    const globalAnalyser = audioCtx.createAnalyser();
    draw();

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

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    activeOscillators = {}
    activeGainNodes = {}
    lfos = {}
    activePartialNodes = {}
    

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            // if there's more than one note played at a time, the gain is divided by the number of notes
            // this is so that the sound doesn't get too tedious
            const activeOscillatorsCount = Object.keys(activeOscillators).length;
            const gain = 0.8 / (activeOscillatorsCount+1);
            if (activeOscillatorsCount > 0) {
                for (const activeOscillator in activeOscillators) {
                    activeGainNodes[activeOscillator].gain.setTargetAtTime(gain, audioCtx.currentTime, 1);
                }
                // console.log(gain);
            }
            var synthType = audioSynth.value;
            playNote(key, gain, synthType);
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            activeGainNodes[key].gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
            activeOscillators[key].stop(audioCtx.currentTime + 0.2);
            lfos[key].stop(audioCtx.currentTime + 0.2);
            for (const partial in activePartialNodes[key]) {
                activePartialNodes[key][partial].stop(audioCtx.currentTime + 0.2);
            }
            for (const partial in activePartialNodes[key]) {
                delete activePartialNodes[key][partial];
            }
            delete activeOscillators[key];
            delete activeGainNodes[key];
            delete lfos[key];
        }
    }

    let lfo;
    var randomColor;
    var noteName;
    function playNote(key, gainVal, synthType) {
        // const modulatorFreq = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.connect(globalAnalyser);

        activeGainNodes[key] = gainNode;

        lfo = audioCtx.createOscillator();

        if (synthType == 'am') {
            amSynth(gainNode, gainVal, key, lfo);
        }
        else if (synthType == 'fm') {
            fmSynth(gainNode, gainVal, key, lfo);
        }
        else {
            additiveSynth(gainNode, gainVal, key, lfo);
        }
    

        noteName = getNoteName(key);
        const noteDisplay = document.getElementById('note-display');
        randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        noteDisplay.textContent = noteName;
        noteDisplay.style.color = randomColor;
    }

    const lfoRangeInput = document.getElementById('lfo-range-input');

    lfoRangeInput.addEventListener('input', function() {
        lfo.frequency.value = this.value;
    });

    // implement AM and FM synthesis
    function amSynth(gainNode, gainVal, key, lfo) {
        const modulatorFreq = audioCtx.createOscillator();
        const carrier = audioCtx.createOscillator();
        modulatorFreq.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)
        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)

        // create gain nodes
        const modulatorGain = audioCtx.createGain();
        const depth = audioCtx.createGain();
        depth.gain.value = 0.5;
        modulatorGain.gain.value = 1.0 - depth.gain.value;
        
        // connect nodes
        modulatorFreq.connect(depth).connect(modulatorGain.gain);
        carrier.connect(modulatorGain)
        modulatorGain.connect(gainNode)
        gainNode.connect(audioCtx.destination);

        carrier.type = wavePicker.value;
        modulatorFreq.type = wavePicker.value;

        // const lfo = audioCtx.createOscillator();
        // Can let user choose frequency of LFO
        lfo.frequency.value = 0.5;
        lfo.connect(modulatorGain.gain);
        lfo.type = wavePicker.value;
        lfo.start();
        lfos[key] = lfo;

        // start oscillators
        carrier.start();
        modulatorFreq.start();

        activeOscillators[key] = modulatorFreq;

        modulatorGain.gain.setTargetAtTime(gainVal/2, audioCtx.currentTime, 0.01);
        depth.gain.setTargetAtTime(gainVal/2, audioCtx.currentTime, 0.01);        
    }

    function fmSynth(gainNode, gainVal, key, lfo){
        const modulatorFreq = audioCtx.createOscillator();
        const carrier = audioCtx.createOscillator();
        modulatorFreq.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)
        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);

        const modulationIndex = audioCtx.createGain();
        const depth = audioCtx.createGain();
        modulationIndex.gain.value = 1;

        modulatorFreq.connect(modulationIndex);
        modulationIndex.connect(carrier.frequency)
        carrier.connect(depth).connect(gainNode);
        gainNode.connect(audioCtx.destination);

        carrier.type = wavePicker.value;
        modulatorFreq.type = wavePicker.value;
        
        // Let user choose frequency of LFO
        lfo.frequency.value = 0.5;
        lfo.connect(depth.gain);
        lfo.type = wavePicker.value;
        lfo.start();
        lfos[key] = lfo;

        carrier.start();
        modulatorFreq.start();

        activeOscillators[key] = modulatorFreq;

        modulationIndex.gain.setTargetAtTime(gainVal/10, audioCtx.currentTime, 0.01);
    }

    function additiveSynth(gainNode, gainVal, key, lfo) {
        const partials = [];
        numPartials = document.getElementById('partials-range-input').value;
        
        lfo.frequency.value = 0.3;
        const partialGain1 = audioCtx.createGain();
        const partialGain2 = audioCtx.createGain();

        lfo.connect(partialGain1);

        for (let i = 1; i <= numPartials; i++) {
          const partialOsc = audioCtx.createOscillator();
          partialOsc.type = wavePicker.value;
          partialOsc.frequency.value = i * keyboardFrequencyMap[key];
          partialGain1.connect(partialOsc.frequency);
          partialOsc.connect(partialGain2);
          partialOsc.start();
          partials.push(partialOsc);
        }
        partialGain2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      
        lfo.start();
        lfos[key] = lfo;

        partialGain1.gain.setTargetAtTime(gainVal/(numPartials*10), audioCtx.currentTime, 1);
        partialGain2.gain.setTargetAtTime(0.0001, audioCtx.currentTime+1, 1);
        gainNode.gain.setTargetAtTime(gainVal/(numPartials*100), audioCtx.currentTime, 1);
      
        activePartialNodes[key] = partials;
    }

    const partialsRangeInput = document.getElementById('partials-range-input');
    const partialsDisplay = document.getElementById('partials-display');

    partialsRangeInput.addEventListener('input', function() {
        partialsDisplay.textContent = this.value;
    });

    function draw() {
        globalAnalyser.fftSize = 2048;
        var bufferLength = globalAnalyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);
        globalAnalyser.getByteTimeDomainData(dataArray);
    
        var canvas = document.querySelector("#globalVisualizer");
        var canvasCtx = canvas.getContext("2d");
    
        requestAnimationFrame(draw);
    
        globalAnalyser.getByteTimeDomainData(dataArray);
    
        canvasCtx.fillStyle = "white";
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = randomColor;
    
        canvasCtx.beginPath();
    
        var sliceWidth = canvas.width * 1.0 / bufferLength;
        var x = 0;
    
        for (var i = 0; i < bufferLength; i++) {
            var v = dataArray[i] / 128.0;
            var y = v * canvas.height / 2;
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
    
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }

    const letterContainer = document.getElementById("letter-container");

    document.addEventListener("keydown", (event) => {
        // Get a random letter
        // const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

        // Create a div element for the falling letter
        const letterElement = document.createElement("div");
        letterElement.className = "letter";
        letterElement.textContent = noteName;
        letterElement.style.color = randomColor;

        // Set a random left position
        letterElement.style.left = Math.random() * 100 + "vw";

        // Append the letter to the container
        letterContainer.appendChild(letterElement);

        // Remove the letter after the animation is complete
        letterElement.addEventListener("animationiteration", () => {
            letterElement.style.animationPlayState = "paused";

        });
    });

});