// Global state
let progressData = JSON.parse(localStorage.getItem('progressData')) || {};
let selectedEquipment = new Set(['bodyweight']);

// --- UI LOGIC ---
function switchTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');

    if (tabName === 'stats') updateStats();
    if (tabName === 'tracking') {
        populateExerciseDropdown();
        addSet(); // Add the first set automatically
        renderAllCharts();
    }
}

function toggleEquipment(element, equipmentType) {
    if (selectedEquipment.has(equipmentType)) {
        selectedEquipment.delete(equipmentType);
        element.classList.remove('selected');
    } else {
        selectedEquipment.add(equipmentType);
        element.classList.add('selected');
    }
}

function toggleCardioOptions() {
    document.getElementById('cardioOptions').classList.toggle('hidden', !document.getElementById('includeCardio').checked);
}

// --- WORKOUT GENERATION ---
function generateWorkoutPlan() {
    if (selectedEquipment.size === 0) {
        alert('💕 Bestie, you need to select at least one equipment option!');
        return;
    }

    const days = parseInt(document.getElementById('workoutDays').value);
    const sessionLength = parseInt(document.getElementById('sessionLength').value);
    const split = document.querySelector('input[name="split"]:checked').value;
    
    const includeCardio = document.getElementById('includeCardio').checked;
    const cardioLength = parseInt(document.getElementById('cardioLength').value);
    const cardioMachine = document.getElementById('cardioMachine').value;

    const includeAbs = document.getElementById('includeAbs').checked;
    const includeFlexibility = document.getElementById('includeFlexibility').checked;
    
    let planHTML = '';
    const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];

    const splitMap = {
        fullBody: ['Full Body'],
        upperLower: ['Upper', 'Lower'],
        pushPullLegs: ['Push', 'Pull', 'Legs']
    };
    
    for (let week = 1; week <= 4; week++) {
        planHTML += `<div class="week-header">🗓️ Week ${week} 🗓️</div>`;
        for (let i = 0; i < days; i++) {
            const dayType = splitMap[split][i % splitMap[split].length];
            planHTML += `<div class="workout-day"><div class="day-header">✨ ${dayNames[i]} - ${dayType} Sesh ✨</div>`;
            
            // 1. Cardio
            if (includeCardio) {
                planHTML += generateSectionHTML('Cardio Warmup', 'tag-cardio', [{name: `${cardioMachine.charAt(0).toUpperCase() + cardioMachine.slice(1)}: ${cardioLength} mins`, details: cardioRoutines[cardioMachine] }]);
            }

            // 2. Main Workout
            const workoutTime = sessionLength - (includeCardio ? cardioLength : 0) - (includeAbs ? 10 : 0) - (includeFlexibility ? 5 : 0);
            planHTML += generateDayWorkout(dayType, workoutTime);

            // 3. Abs Finisher
            if (includeAbs) {
                const abExercises = getExercisesByMuscles(['Abs'], 3);
                planHTML += generateSectionHTML('Abs Finisher (2-3 rounds)', 'tag-abs', abExercises);
            }

            // 4. Flexibility
            if (includeFlexibility) {
                planHTML += `<h4>Stretchy Cool-down Ideas</h4>`;
                planHTML += `<div class="exercise-item">
                    <p style="margin-bottom: 10px;">Choose 3-4 stretches that target the muscles you worked. Hold each for 30-60 seconds, breathing deeply. Don't push into pain!</p>
                    <ul style="list-style-position: inside;">
                        <li><strong>After Push/Upper Body:</strong> Focus on Chest (Doorway Stretch) and Shoulders (Cross-body Stretch).</li>
                        <li><strong>After Pull/Upper Body:</strong> Focus on Lats (Child's Pose) and Biceps.</li>
                        <li><strong>After Legs/Lower Body:</strong> Focus on Hamstrings (Seated Forward Bend), Quads (Lying Quad Stretch), and Glutes (Pigeon Pose).</li>
                        <li><strong>After Full Body:</strong> Try a full-flow like Downward Dog, Cat-Cow, and World's Greatest Stretch.</li>
                    </ul>
                </div>`;
            }

            planHTML += '</div>';
        }
    }
    
    document.getElementById('workoutPlan').innerHTML = planHTML;
    document.getElementById('printButton').classList.remove('hidden'); // Show the print button
    switchTab({currentTarget: document.querySelector('.tab[onclick*="workout"]')}, 'workout');
}

function generateSectionHTML(title, tagClass, exercises) {
    let html = `<h4>${title}</h4>`;
    exercises.forEach(ex => {
         html += `<div class="exercise-item">
            <strong>${ex.name}</strong>
            ${ex.details ? `<br><small>${ex.details}</small>` : ''}
            ${ex.type ? `<div style="margin-top: 10px;"><span class="exercise-tag ${ex.type === 'compound' ? 'tag-compound' : 'tag-isolation'}">${ex.type}</span></div>` : ''}
            ${ex.muscles ? `<div>${ex.muscles.map(m => `<span class="exercise-tag tag-muscle">${m}</span>`).join('')}</div>` : ''}
        </div>`;
    });
    return html;
}

function getExercisesByMuscles(muscleGroups, count) {
    let availableExercises = [];
     Object.entries(exerciseDB).forEach(([group, exercises]) => {
        if (muscleGroups.includes(group)) {
            exercises.forEach(ex => {
                if (ex.equipment.some(eq => selectedEquipment.has(eq))) {
                    availableExercises.push(ex);
                }
            });
        }
    });
    return [...availableExercises].sort(() => 0.5 - Math.random()).slice(0, count);
}

function generateDayWorkout(dayType, workoutTime) {
    const muscleGroups = {
        'Push': ['Chest', 'Shoulders', 'Arms'], // Triceps focus
        'Pull': ['Back', 'Arms'], // Biceps focus
        'Legs': ['Legs'],
        'Upper': ['Chest', 'Back', 'Shoulders', 'Arms'],
        'Lower': ['Legs'],
        'Full Body': ['Chest', 'Back', 'Legs', 'Shoulders']
    };

    let availableExercises = [];
    muscleGroups[dayType].forEach(group => {
        if(exerciseDB[group]) {
            exerciseDB[group].forEach(ex => {
                if (ex.equipment.some(eq => selectedEquipment.has(eq))) {
                    availableExercises.push(ex);
                }
            });
        }
    });
    
    const compounds = availableExercises.filter(ex => ex.type === 'compound').sort(() => 0.5 - Math.random());
    const isolations = availableExercises.filter(ex => ex.type === 'isolation').sort(() => 0.5 - Math.random());
    
    const numExercises = Math.max(5, Math.floor(workoutTime / 7)); // Approx 7 mins per exercise
    const numCompounds = Math.min(compounds.length, Math.max(2, Math.ceil(numExercises * 0.4)));
    const numIsolations = Math.min(isolations.length, Math.max(4, numExercises - numCompounds));
    
    const selectedExercises = compounds.slice(0, numCompounds).concat(isolations.slice(0, numIsolations));

    if (selectedExercises.length === 0) return `<p>Couldn't find any exercises for this setup! Try selecting more equipment.</p>`;

    return generateSectionHTML(`Main Lift (Sets: 3-4 | Reps: 8-12)`, 'tag-main', selectedExercises);
}

// --- NEW, RELIABLE PRINT FUNCTION ---
function printWorkoutPlan() {
    const planContent = document.getElementById('workoutPlan');
    if (!planContent || planContent.children.length === 0) {
        alert("Please generate a workout plan first!");
        return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    printWindow.document.write('<html><head><title>Your 4-Week Workout Plan</title>');
    printWindow.document.write(`
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { text-align: center; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: auto; }
            th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .week-title { font-size: 1.6em; font-weight: bold; margin-top: 40px; padding-bottom: 10px; border-bottom: 2px solid #000; page-break-before: always; }
            .week-title:first-of-type { page-break-before: auto; }
            .day-row { page-break-inside: avoid; }
            ul { margin: 0; padding-left: 20px; }
            ul ul { margin-top: 5px; }
            li { margin-bottom: 5px; }
            li strong { font-weight: bold; }
        </style>
    `);
    
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Your 4-Week Workout Plan</h1>');

    const weeks = planContent.querySelectorAll('.week-header');
    
    weeks.forEach(weekHeader => {
        const weekText = weekHeader.textContent;
        printWindow.document.write(`<div class="week-title">${weekText.replace('🗓️', '').trim()}</div>`);
        printWindow.document.write('<table>');
        printWindow.document.write('<tr><th>Day</th><th>Exercises</th></tr>');

        let nextElement = weekHeader.nextElementSibling;
        while(nextElement && !nextElement.classList.contains('week-header')) {
            if (nextElement.classList.contains('workout-day')) {
                const dayHeaderText = nextElement.querySelector('.day-header').textContent.trim().replace('✨', '').replace('Sesh', '').trim();
                let exercisesHTML = '<ul>';
                
                nextElement.querySelectorAll('h4').forEach(sectionTitle => {
                     exercisesHTML += `<li><strong>${sectionTitle.textContent}</strong></li>`;
                     let exerciseList = '<ul>';
                     let nextExercise = sectionTitle.nextElementSibling;
                     while(nextExercise && nextExercise.classList.contains('exercise-item')){
                        const exerciseName = nextExercise.querySelector('strong').textContent;
                        const exerciseDetails = nextExercise.querySelector('small') ? `(${nextExercise.querySelector('small').textContent})` : '';
                        exerciseList += `<li>${exerciseName} ${exerciseDetails}</li>`;
                        nextExercise = nextExercise.nextElementSibling;
                     }
                     exerciseList += '</ul>';
                     exercisesHTML += exerciseList;
                });
                
                exercisesHTML += '</ul>';

                printWindow.document.write(`<tr class="day-row">
                    <td style="vertical-align: top; width: 25%; font-weight: bold;">${dayHeaderText}</td>
                    <td>${exercisesHTML}</td>
                </tr>`);
            }
            nextElement = nextElement.nextElementSibling;
        }
        
        printWindow.document.write('</table>');
    });

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 250);
}


// --- PROGRESS TRACKING ---
function populateExerciseDropdown() {
    const select = document.getElementById('exerciseSelect');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Choose your exercise bestie...</option>';
    
    const allExercises = new Set();
    Object.values(exerciseDB).flat().forEach(ex => allExercises.add(ex.name));
    
    [...allExercises].sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
    select.value = currentVal;
}

function addSet() {
    const container = document.getElementById('logSetsContainer');
    const setNumber = container.children.length + 1;
    const setRow = document.createElement('div');
    setRow.className = 'set-row';
    setRow.innerHTML = `
        <span>Set ${setNumber}:</span>
        <input type="number" class="reps-input" placeholder="Reps">
        <span>x</span>
        <input type="number" class="weight-input" placeholder="kg">
    `;
    container.appendChild(setRow);
}

function logProgress() {
    const exercise = document.getElementById('exerciseSelect').value;
    const date = document.getElementById('dateInput').value;
    
    if (!exercise || !date) {
        alert('💕 Please pick an exercise and date!');
        return;
    }
    
    const sets = [];
    document.querySelectorAll('#logSetsContainer .set-row').forEach(row => {
        const reps = parseInt(row.querySelector('.reps-input').value);
        const weight = parseFloat(row.querySelector('.weight-input').value);
        if (!isNaN(reps) && !isNaN(weight)) {
            sets.push({ reps, weight });
        }
    });

    if (sets.length === 0) {
        alert('💕 You need to log at least one set, bestie!');
        return;
    }

    if (!progressData[exercise]) progressData[exercise] = [];

    const existingEntryIndex = progressData[exercise].findIndex(entry => entry.date === date);
    if (existingEntryIndex > -1) {
        progressData[exercise][existingEntryIndex].sets = sets;
    } else {
        progressData[exercise].push({ date, sets });
    }

    progressData[exercise].sort((a, b) => new Date(a.date) - new Date(b.date));

    localStorage.setItem('progressData', JSON.stringify(progressData));
    alert('✨ Progress logged! You are glowing up! ✨');
    renderAllCharts();
    document.getElementById('logSetsContainer').innerHTML = '';
    addSet();
}

function renderAllCharts() {
    const container = document.getElementById('progressGraphsContainer');
    container.innerHTML = ''; // Clear previous charts

    const exercisesWithData = Object.keys(progressData).filter(ex => progressData[ex] && progressData[ex].length > 0);
    
    if (exercisesWithData.length === 0) {
        container.innerHTML = '<p>Log some workouts to see your progress charts here!</p>';
        return;
    }

    exercisesWithData.forEach(exerciseName => {
        const chartWrapper = document.createElement('div');
        chartWrapper.style.marginBottom = '40px';
        
        const title = document.createElement('h4');
        title.innerText = `📈 ${exerciseName} Progress`;
        title.style.marginBottom = '15px';

        const canvas = document.createElement('canvas');
        
        chartWrapper.appendChild(title);
        chartWrapper.appendChild(canvas);
        container.appendChild(chartWrapper);
        
        const ctx = canvas.getContext('2d');
        const exerciseData = progressData[exerciseName];

        const chartData = exerciseData.map(entry => ({
            x: new Date(entry.date),
            y: Math.max(...entry.sets.map(set => set.weight))
        }));
        
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Max Weight (kg)`,
                    data: chartData,
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day' },
                        title: { display: true, text: 'Date' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Weight (kg)' }
                    }
                },
                plugins: {
                   legend: { display: false }
                }
            }
        });
    });
}

// --- STATS ---
function updateStats() {
    const statsGrid = document.getElementById('statsGrid');
    let totalWorkouts = 0;
    let totalVolume = 0;
    let totalSets = 0;
    let maxLift = 0;
    let heaviestLiftExercise = '';
    
    const workoutDates = new Set();
    Object.entries(progressData).forEach(([exercise, sessions]) => {
        sessions.forEach(session => {
            workoutDates.add(session.date);
            session.sets.forEach(set => {
                totalSets++;
                const volume = set.reps * set.weight;
                totalVolume += volume;
                if(set.weight > maxLift) {
                    maxLift = set.weight;
                    heaviestLiftExercise = exercise;
                }
            });
        });
    });
    totalWorkouts = workoutDates.size;
    
    statsGrid.innerHTML = `
        <div class="stat-card"><div class="stat-number">${totalWorkouts}</div><div>🏋️‍♀️ Total Slaying Sessions</div></div>
        <div class="stat-card"><div class="stat-number">${totalSets}</div><div>💪 Sets That Hit Different</div></div>
        <div class="stat-card"><div class="stat-number">${Math.round(totalVolume)}</div><div>⚖️ Total Volume (kg)</div></div>
        <div class="stat-card"><div class="stat-number">${maxLift} kg</div><div>Heaviest lift on ${heaviestLiftExercise || 'N/A'}</div></div>
    `;
}


// --- INITIALIZATION ---
window.onload = function() {
    document.getElementById('dateInput').valueAsDate = new Date();
    populateExerciseDropdown();
    renderAllCharts();
};