const MAX_PLAYERS = 4;
const GUTTER = 100;

const colors = [
    '#3E6990',
    '#AABD8C',
    '#E9E3B4',
    '#F39B6D'
];

var backgroundColor = '#381D2A'

var COLUMN_WIDTH;

// var testSinOsc;
// var testEnv;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(color(backgroundColor));

    userStartAudio().then(function() {
        document.dispatchEvent(new Event('p5-ready'));
    });

    backgroundColor = color(backgroundColor)
    backgroundColor.setAlpha(20);
}

function draw() {

    COLUMN_WIDTH = (width - (GUTTER * (MAX_PLAYERS + 1))) / MAX_PLAYERS;

    fill(backgroundColor, 20);
    noStroke();
    rect(0, 0, width, height);

    let i = 0;
    for (p in pulses) {
        if (pulses[p].justPulsed()) {
            let index = playerIndexToId.indexOf(pulses[p].userId);
            // console.log("^ player " + p + " pulse.");
            
            fill(colors[index]);
            circle(
                GUTTER + index * (COLUMN_WIDTH + GUTTER) + COLUMN_WIDTH / 2, 
                height / 2, 
                COLUMN_WIDTH);
        }
    }

    //fill(224, 122, 95);
    //fill(152, 68, 71);
    //fill(129, 178, 154);
    //fill(242, 204, 143);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function movePitch(pitch, interval) {
    return pitch * Math.pow(2, interval / 12);
}

// function keyPressed(e) {
    
//     if (e.key == 'a') {
//         console.log('!')
//         testSinOsc = new p5.SinOsc();
//         testEnv = new p5.Envelope();
//         testSinOsc.amp(testEnv);
//         testSinOsc.start();
//         testSinOsc.freq(440);
//         testEnv.setRange(1);
//         testEnv.setADSR(1, 0.2, 1, 1);
//         testEnv.play();
//     }
// }
