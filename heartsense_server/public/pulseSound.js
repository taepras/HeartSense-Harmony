const SMOOTHING_COEFF_CURRENT = 0.4;
const SMOOTHING_COEFF_BASELINE = 0.96;
const NUM_BEATS_FOR_INIT = 7;

const IBI_DIFF_PER_PITCH_UNIT = 150; // approx 20 bpm from 80 to 100
// const PITCH_UNIT = 4; // major third
const PITCH_UNIT = 9; // majoy sixth
const MAX_PITCH_CHANGE_PER_BEAT = 0.5; // quarter tone
const DEFAULT_IBI = 750;

// sound envelope ADSRs
const ENV_LEVEL_PULSE = 0.7;
const ENV_A = 0.1; // attack
const ENV_D = 0.005; // decay
const ENV_S = 1; // sustain
const ENV_R = 0.7; //release

const ENV_LEVEL_INIT = 0.2;
const ENV_A_INIT = 1; // attack
const ENV_D_INIT = 0.25; // decay
const ENV_S_INIT = 1; // sustain
const ENV_R_INIT = 1.5; //release


class PulseSound {
    constructor(userId, baseFreq) {
        console.log('new pulsesound')
        this.color = {
            r: Math.floor(Math.random() * 255),
            g: Math.floor(Math.random() * 255),
            b: Math.floor(Math.random() * 255)
        }

        this.userId = userId;
        this.baseFreq = baseFreq;

        this.currentFreq = 0;
        this.hasInited = true; // for first reset

        this.lastPulse = -1;
        this.numBeats = 0;
        this.hasPulsed = false;

        this.ibi = DEFAULT_IBI;
        this.baseIbi = DEFAULT_IBI;
        this.currentIbiSmoothed = DEFAULT_IBI;
        this.baseIbiSmoothed = DEFAULT_IBI;

        this.sinOsc = new p5.SinOsc(baseFreq);
        this.env = new p5.Envelope();

        this.sinOsc.amp(this.env);
        // this.sinOsc.amp(0.5);
        this.sinOsc.start();

        // this.ibi = random(SIM_MIN_IBI, SIM_MAX_IBI);

        this.sinOsc.freq(this.baseFreq);
        this.env.setRange(ENV_LEVEL_INIT);
        this.env.setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
        this.env.play();

        // this.reset();

        this.initList = [];
    }

    reset() {
        if (!this.hasInited) return;
        this.numBeats = 0;
        this.baseIbiSmoothed = DEFAULT_IBI;
        this.currentIbiSmoothed = DEFAULT_IBI;
        this.currentFreq = 0;
        this.hasInited = false;
        console.log("pulse reset");

        this.sinOsc.freq(this.baseFreq);
        this.env.setRange(ENV_LEVEL_INIT);
        this.env.setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
        this.env.play();

        this.initList = [];

        // this.justPulsed = true;
    }

    newPulse(ibiInput) {
        let thisIbi = ibiInput || +new Date() - this.lastPulse;
        
        // tune sound
        this.hasInited = true;
        if (this.numBeats < NUM_BEATS_FOR_INIT) {
            this.initList.push(thisIbi);
            this.initList.sort((a, b) => a - b);

            let n = this.initList.length;
            if (n > 1) {
                let median = this.initList.length % 2 == 1 ? 
                    this.initList[Math.floor(n / 2)] :
                    (this.initList[n / 2 - 1] + this.initList[n / 2]) / 2;
                
                this.baseIbiSmoothed = median;
                this.currentIbiSmoothed = median;
            } else {
                this.baseIbiSmoothed = thisIbi;
                this.currentIbiSmoothed = thisIbi;
            }

            console.log('initing', this.initList, this.baseIbiSmoothed);
        } else {
            this.currentIbiSmoothed =
                this.currentIbiSmoothed * SMOOTHING_COEFF_CURRENT +
                thisIbi * (1.0 - SMOOTHING_COEFF_CURRENT);
            this.baseIbiSmoothed =
                this.baseIbiSmoothed * SMOOTHING_COEFF_BASELINE +
                thisIbi * (1.0 - SMOOTHING_COEFF_BASELINE);
        }

        // sound shifting rule:
        // 1. if it's +20 bpm higher (150 ms diff in ibi), the sound should just be a minor third
        // 2. only shift at most a quarter tone) a time
        let ibiChange = this.currentIbiSmoothed - this.baseIbiSmoothed;
        this.targetFreq = movePitch(
            this.baseFreq,
            (-ibiChange / IBI_DIFF_PER_PITCH_UNIT) * PITCH_UNIT
        );
        if (this.currentFreq == 0) {
            this.currentFreq = this.baseFreq;
        } else {
            if (
                this.targetFreq >=
                movePitch(this.currentFreq, MAX_PITCH_CHANGE_PER_BEAT)
            ) {
                this.currentFreq = movePitch(
                    this.currentFreq,
                    MAX_PITCH_CHANGE_PER_BEAT
                );
            } else if (
                this.targetFreq <=
                movePitch(this.currentFreq, -MAX_PITCH_CHANGE_PER_BEAT)
            ) {
                this.currentFreq = movePitch(
                    this.currentFreq,
                    -MAX_PITCH_CHANGE_PER_BEAT
                );
            }
        }

        // play sound
        this.sinOsc.freq(this.currentFreq);
        this.env.setRange(ENV_LEVEL_PULSE);
        this.env.setADSR(ENV_A, ENV_D, ENV_S, ENV_R);
        this.env.play();

        console.log(
            this.userId, 
            "raw: ",
            thisIbi,
            "current - base: ",
            nf(this.currentIbiSmoothed, 4, 2),
            " - ",
            nf(this.baseIbiSmoothed, 4, 2),
            " = ",
            nfp(ibiChange, 3, 2),
            "base freq: ",
            nf(this.baseFreq, 3, 1),
            "adjusted freq: ",
            nf(this.currentFreq, 3, 1)
        );

        //latestIbi = thisIbi;
        this.lastPulse = +new Date();
        this.numBeats++;
        this.hasPulsed = true;
    }

    justPulsed() {
        let out = this.hasPulsed;
        this.hasPulsed = false;
        return out;
    }

    toggleActive() {
        setActive(!isActive());
    }

    setActive(active) {
        this.isActive = active;
        if (!this.isActive) {
            reset();
        }
    }

    isActive() {
        return this.isActive;
    }

    movePitch(pitch, interval) {
        return pitch * Math.pow(2, interval / 12);
    }

    setPan(p) {
        this.sinOsc.pan(p);
    }
}
