export const DEFAULT_QUIZ = {
    title: "Classroom Physics & Earth Science Check",
    questions: [
        {
            id: "q1",
            question: "Which layer of Earth's atmosphere is closest to the planet's surface?",
            options: [
                { id: "opt1", text: "Stratosphere", isCorrect: false, explanation: "The stratosphere sits directly above the troposphere (from ~12 to 50 km up)." },
                { id: "opt2", text: "Troposphere", isCorrect: true, explanation: "" },
                { id: "opt3", text: "Mesosphere", isCorrect: false, explanation: "The mesosphere is much higher up, located above the stratosphere." },
                { id: "opt4", text: "Thermosphere", isCorrect: false, explanation: "The thermosphere is one of the outer atmospheric layers, extending hundreds of kilometers out." }
            ]
        },
        {
            id: "q2",
            question: "What primary force keeps planets in orbit around the Sun?",
            options: [
                { id: "opt1", text: "Electromagnetic Force", isCorrect: false, explanation: "Electromagnetism governs charged particles, not celestial orbital mechanics." },
                { id: "opt2", text: "Centrifugal Force", isCorrect: false, explanation: "Centrifugal force is an apparent inertia effect in a rotating reference frame, not the fundamental attraction." },
                { id: "opt3", text: "Gravitational Force", isCorrect: true, explanation: "" },
                { id: "opt4", text: "Nuclear Force", isCorrect: false, explanation: "Strong/Weak nuclear forces act inside atomic nuclei across subatomic distances." }
            ]
        }
    ]
};
