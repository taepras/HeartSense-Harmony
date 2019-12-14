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
const ENV_A = 0.001; // attack
const ENV_D = 0.01; // decay
const ENV_S = 1; // sustain
const ENV_R = 1; //release

const ENV_LEVEL_INIT = 0.2;
const ENV_A_INIT = 1; // attack
const ENV_D_INIT = 0.25; // decay
const ENV_S_INIT = 1; // sustain
const ENV_R_INIT = 1.5; //release


class PulseSound {
    constructor(userId, baseFreq, harmonics) {
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

        // this.harmonics = [1, 0.68, 1.22, 0.13]//, 0.13, 0.12, 0.01, 0.02, 0.2, 0.06, 0.02];
        // this.harmonics = [1, 9, 3.6, 1.8]//, 0.25, 0.12, 0.0];
        // this.harmonics = [1, 0.12, 0.32, 0.06]//, 0.05, 0.05]//, 0.01, 0.02, 0.01];
        this.harmonics = harmonics; //[1, 0.36, 0.26, 0.01]//, 0.07, 0.2]//, 0.02]

        // normalize harmonics
        let maxHarmonic = this.harmonics.reduce((a, b) => Math.max(a, b));
        console.log(this.harmonics, maxHarmonic);
        for (let i in this.harmonics){
            this.harmonics[i] = this.harmonics[i] / maxHarmonic;
        }
        this.oscillators = [];
        
        // this.env = new p5.Envelope();
        this.envs = [];

        for (let i in this.harmonics) {
            let env = new p5.Envelope();
            env.setRange(ENV_LEVEL_INIT);
            env.mult(this.harmonics[i]);
            env.setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
            env.play();
            this.envs.push(env);

            let osc = new p5.SinOsc(baseFreq * (i + 1));
            // console.log(env)
            osc.amp(env);
            osc.freq(baseFreq * (i + 1));
            osc.start();
            this.oscillators.push(osc);
        }
        
        // this.sinOsc = new p5.SinOsc(baseFreq);
        // this.sinOsc.amp(this.env);
        // this.sinOsc.start();

        // this.ibi = random(SIM_MIN_IBI, SIM_MAX_IBI);

        // this.sinOsc.freq(this.baseFreq);
        // this.env.setRange(ENV_LEVEL_INIT);
        // this.env.setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
        // this.env.play();

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

        // this.sinOsc.freq(this.baseFreq);
        for (let i in this.harmonics) {
            this.oscillators[i].freq(baseFreq * (i + 1));

            this.envs[i].setRange(ENV_LEVEL_INIT);
            this.envs[i].mult(this.harmonics[i]);
            this.envs[i].setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
            this.envs[i].play();
        }
        // this.env.setRange(ENV_LEVEL_INIT);
        // this.env.setADSR(ENV_A_INIT, ENV_D_INIT, ENV_S_INIT, ENV_R_INIT);
        // this.env.play();

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
        // this.sinOsc.freq(this.currentFreq);
        for (let i in this.harmonics) {
            // console.log(this.currentFreq, i, this.currentFreq * 2, this.currentFreq * (+i + 1));
            this.oscillators[i].freq(this.currentFreq * (+i + 1));
            this.envs[i].setRange(ENV_LEVEL_PULSE);
            this.envs[i].mult(this.harmonics[i]);
            this.envs[i].setADSR(ENV_A, ENV_D, ENV_S, ENV_R);
            this.envs[i].play();
        }
        
        // this.env.setRange(ENV_LEVEL_PULSE);
        // this.env.setADSR(ENV_A, ENV_D, ENV_S, ENV_R);
        // this.env.play();

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
        // this.sinOsc.pan(p);
        for (let i in this.harmonics) {
            this.oscillators[i].pan(p);
        }
    }
}
