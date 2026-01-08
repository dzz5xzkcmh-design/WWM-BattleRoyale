// WWM Battle Royale - Fragendatenbank
// Hier kannst du beliebig viele Fragen hinzufügen

const QUESTIONS = [
    // Multiple Choice Fragen
    {
        type: 'multiple-choice',
        question: 'Welches ist das größte Säugetier der Welt?',
        answers: ['Elefant', 'Blauwal', 'Giraffe', 'Nashorn'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'In welchem Jahr fiel die Berliner Mauer?',
        answers: ['1987', '1989', '1991', '1990'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Welche Programmiersprache wurde 1995 von Brendan Eich entwickelt?',
        answers: ['Python', 'Java', 'JavaScript', 'C++'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'Wie viele Bundesländer hat Deutschland?',
        answers: ['14', '15', '16', '17'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'Was ist die Hauptstadt von Australien?',
        answers: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'Welches chemische Element hat das Symbol "Au"?',
        answers: ['Silber', 'Gold', 'Aluminium', 'Kupfer'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Wie heißt der längste Fluss der Welt?',
        answers: ['Nil', 'Amazonas', 'Jangtsekiang', 'Mississippi'],
        correct: 0
    },
    {
        type: 'multiple-choice',
        question: 'Wer schrieb "Romeo und Julia"?',
        answers: ['Charles Dickens', 'William Shakespeare', 'Johann Wolfgang von Goethe', 'Friedrich Schiller'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Wie viele Tasten hat ein Standard-Klavier?',
        answers: ['76', '82', '88', '92'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'In welchem Jahr wurde die Titanic fertiggestellt?',
        answers: ['1909', '1911', '1912', '1914'],
        correct: 1
    },

    // Sortier-Fragen
    {
        type: 'sorting',
        question: 'Ordne folgende Planeten nach ihrer Entfernung zur Sonne (nah → fern):',
        items: ['Mars', 'Erde', 'Jupiter', 'Merkur'],
        correct: [3, 1, 0, 2] // Merkur, Erde, Mars, Jupiter
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Ereignisse chronologisch (alt → neu):',
        items: ['Mondlandung', 'Fall der Berliner Mauer', 'Erfindung des Internets', '9/11'],
        correct: [0, 2, 1, 3] // Mondlandung (1969), Internet (~1969), Mauerfall (1989), 9/11 (2001)
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Zahlen nach Größe (klein → groß):',
        items: ['π (Pi)', '√2 (Wurzel 2)', 'e (Eulersche Zahl)', 'φ (Goldener Schnitt)'],
        correct: [1, 3, 2, 0] // √2 ≈ 1.41, φ ≈ 1.62, e ≈ 2.72, π ≈ 3.14
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Filme nach Erscheinungsjahr (alt → neu):',
        items: ['Matrix', 'Star Wars', 'Avatar', 'Inception'],
        correct: [1, 0, 3, 2] // Star Wars (1977), Matrix (1999), Inception (2010), Avatar (2009)
    },
    {
        type: 'sorting',
        question: 'Ordne folgende deutschen Städte nach Einwohnerzahl (klein → groß):',
        items: ['Berlin', 'München', 'Köln', 'Hamburg'],
        correct: [2, 1, 3, 0] // Köln, München, Hamburg, Berlin
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Kontinente nach Fläche (klein → groß):',
        items: ['Afrika', 'Europa', 'Asien', 'Australien'],
        correct: [3, 1, 0, 2] // Australien, Europa, Afrika, Asien
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Tiere nach ihrer Lebenserwartung (kurz → lang):',
        items: ['Elefant', 'Hund', 'Schildkröte', 'Maus'],
        correct: [3, 1, 0, 2] // Maus (~2 Jahre), Hund (~15), Elefant (~70), Schildkröte (~100+)
    },
    {
        type: 'sorting',
        question: 'Ordne folgende Erfindungen chronologisch (alt → neu):',
        items: ['Smartphone', 'Telefon', 'Computer', 'Radio'],
        correct: [1, 3, 2, 0] // Telefon (1876), Radio (1895), Computer (1940er), Smartphone (2007)
    },

    // Weitere Multiple Choice Fragen
    {
        type: 'multiple-choice',
        question: 'Wie viele Herzen hat ein Oktopus?',
        answers: ['1', '2', '3', '4'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'Welcher Planet ist der Sonne am nächsten?',
        answers: ['Venus', 'Merkur', 'Mars', 'Erde'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Wie heißt die Angst vor Spinnen?',
        answers: ['Klaustrophobie', 'Arachnophobie', 'Akrophobie', 'Agoraphobie'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Welches Gas benötigen Pflanzen für die Photosynthese?',
        answers: ['Sauerstoff', 'Stickstoff', 'Kohlendioxid', 'Wasserstoff'],
        correct: 2
    },
    {
        type: 'multiple-choice',
        question: 'Wie viele Augen hat eine Biene?',
        answers: ['2', '3', '4', '5'],
        correct: 3
    },
    {
        type: 'multiple-choice',
        question: 'In welchem Land befindet sich die Chinesische Mauer?',
        answers: ['Japan', 'China', 'Korea', 'Vietnam'],
        correct: 1
    },
    {
        type: 'multiple-choice',
        question: 'Welches ist das schnellste Landtier?',
        answers: ['Leopard', 'Gepard', 'Löwe', 'Tiger'],
        correct: 1
    }
];

// Funktion zum Mischen der Fragen
function shuffleQuestions() {
    return QUESTIONS.sort(() => Math.random() - 0.5);
}

// Funktion zum Abrufen einer zufälligen Frage
function getRandomQuestion() {
    return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
}

// Funktion zum Abrufen einer spezifischen Frage nach Index
function getQuestion(index) {
    return QUESTIONS[index % QUESTIONS.length];
}