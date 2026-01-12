// Quiz Royale - Fragendatenbank (NUR Multiple Choice!)

// Fisher-Yates Shuffle
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Original questions pool - NUR MULTIPLE CHOICE!
const QUESTIONS_POOL = [
    {
        type: 'multiple',
        question: 'Welches ist das größte Säugetier der Welt?',
        answers: ['Elefant', 'Blauwal', 'Giraffe', 'Hai'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'In welchem Jahr fiel die Berliner Mauer?',
        answers: ['1987', '1989', '1991', '1985'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welche Programmiersprache wird hauptsächlich für Webseiten verwendet?',
        answers: ['Python', 'JavaScript', 'C++', 'Ruby'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Herzen hat ein Oktopus?',
        answers: ['1', '2', '3', '4'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welcher Planet ist der Sonne am nächsten?',
        answers: ['Venus', 'Merkur', 'Mars', 'Erde'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Beine hat eine Spinne?',
        answers: ['6', '8', '10', '12'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welches ist das kleinste Land der Welt?',
        answers: ['Monaco', 'Vatikanstadt', 'San Marino', 'Liechtenstein'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'In welchem Land befindet sich die Chinesische Mauer?',
        answers: ['Japan', 'China', 'Korea', 'Mongolei'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welcher Ozean ist der größte?',
        answers: ['Atlantik', 'Indischer Ozean', 'Pazifik', 'Arktischer Ozean'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Wie viele Kontinente gibt es?',
        answers: ['5', '6', '7', '8'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welche Farbe hat ein Smaragd?',
        answers: ['Rot', 'Blau', 'Grün', 'Gelb'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Wer malte die Mona Lisa?',
        answers: ['Pablo Picasso', 'Leonardo da Vinci', 'Vincent van Gogh', 'Michelangelo'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welches ist das schnellste Landtier?',
        answers: ['Löwe', 'Gepard', 'Antilope', 'Pferd'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Zähne hat ein erwachsener Mensch normalerweise?',
        answers: ['28', '30', '32', '34'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welches ist die Hauptstadt von Frankreich?',
        answers: ['London', 'Berlin', 'Paris', 'Rom'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welches Element hat das chemische Symbol "O"?',
        answers: ['Gold', 'Sauerstoff', 'Osmium', 'Ozon'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?',
        answers: ['9', '10', '11', '12'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welcher ist der längste Fluss der Welt?',
        answers: ['Amazonas', 'Nil', 'Jangtse', 'Mississippi'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'In welchem Jahr endete der Zweite Weltkrieg?',
        answers: ['1943', '1944', '1945', '1946'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Wie heißt die Hauptstadt von Japan?',
        answers: ['Peking', 'Seoul', 'Tokio', 'Bangkok'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welches ist das meistgesprochene Sprache der Welt?',
        answers: ['Englisch', 'Spanisch', 'Mandarin', 'Hindi'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'In welchem Jahr landeten Menschen zum ersten Mal auf dem Mond?',
        answers: ['1967', '1969', '1971', '1973'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welches Tier ist das Symbol von WWF?',
        answers: ['Tiger', 'Panda', 'Elefant', 'Eisbär'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Sekunden hat eine Stunde?',
        answers: ['3000', '3600', '4000', '4200'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welches ist das größte Organ des menschlichen Körpers?',
        answers: ['Herz', 'Lunge', 'Leber', 'Haut'],
        correct: 3
    },
    {
        type: 'multiple',
        question: 'In welcher Stadt steht die Freiheitsstatue?',
        answers: ['Los Angeles', 'New York', 'Miami', 'Chicago'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Knochen hat ein erwachsener Mensch?',
        answers: ['186', '206', '226', '246'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welche Farbe erhält man wenn man Gelb und Blau mischt?',
        answers: ['Orange', 'Grün', 'Violett', 'Braun'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'In welchem Land wurde Pizza erfunden?',
        answers: ['Spanien', 'Griechenland', 'Italien', 'Frankreich'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Wie heißt die Hauptstadt von Australien?',
        answers: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welcher Planet ist als "Roter Planet" bekannt?',
        answers: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Saiten hat eine Standard-Gitarre?',
        answers: ['4', '5', '6', '7'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welches Element hat das chemische Symbol "Au"?',
        answers: ['Silber', 'Gold', 'Aluminium', 'Kupfer'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'In welchem Jahr begann der Zweite Weltkrieg?',
        answers: ['1937', '1939', '1941', '1943'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Olympische Ringe gibt es?',
        answers: ['3', '4', '5', '6'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welches ist das schnellste Tier im Wasser?',
        answers: ['Hai', 'Delfin', 'Schwertfisch', 'Thunfisch'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Wie heißt der höchste Berg der Erde?',
        answers: ['K2', 'Mount Everest', 'Kilimandscharo', 'Mont Blanc'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Welches Tier kann sein Gehirn regenerieren?',
        answers: ['Delfin', 'Krake', 'Elefant', 'Rabe'],
        correct: 1
    },
    {
        type: 'multiple',
        question: 'Wie viele Minuten hat ein Tag?',
        answers: ['1200', '1380', '1440', '1500'],
        correct: 2
    },
    {
        type: 'multiple',
        question: 'Welche Farbe hat das "Black Box" Flugschreiber?',
        answers: ['Schwarz', 'Orange', 'Rot', 'Gelb'],
        correct: 1
    }
];

// Shuffle questions on load
const QUESTIONS = shuffleArray(QUESTIONS_POOL);

console.log('📝 Fragen wurden gemischt! Erste Frage:', QUESTIONS[0]?.question);
console.log('📊 Gesamt Fragen:', QUESTIONS.length, '(Alle Multiple Choice)');
console.log('🎯 Frage-Typen:', QUESTIONS.filter(q => q.type === 'multiple').length, 'Multiple Choice');