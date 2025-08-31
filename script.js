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
    const fitnessLevel = document.getElementById('fitnessLevel').value;
    
    const includeCardio = document.getElementById('includeCardio').checked;
    const cardioLength = parseInt(document.getElementById('cardioLength').value);
    const cardioMachine = document.getElementById('cardioMachine').value;

    const includeAbs = document.getElementById('includeAbs').checked;
    const includeFlexibility = document.getElementById('includeFlexibility').checked;
    
    const mustHaves = Array.from(document.getElementById('mustHaveExercises').selectedOptions).map(opt => opt.value);
    const avoids = new Set(Array.from(document.getElementById('avoidExercises').selectedOptions).map(opt => opt.value));

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
            planHTML += generateDayWorkout(dayType, workoutTime, mustHaves, avoids, fitnessLevel);

            // 3. Abs Finisher
            if (includeAbs) {
                let allAbs = getExercisesByMuscles(['Abs', 'Core'], 100, avoids, fitnessLevel); 
                let compoundAbs = allAbs.filter(ex => ex.type === 'compound').sort(() => 0.5 - Math.random());
                let isolationAbs = allAbs.filter(ex => ex.type === 'isolation').sort(() => 0.5 - Math.random());
                
                const numCompoundAbs = Math.min(compoundAbs.length, 1);
                const selectedAbs = compoundAbs.slice(0, numCompoundAbs);
                const remainingAbsCount = 3 - selectedAbs.length;
                if(remainingAbsCount > 0) {
                    selectedAbs.push(...isolationAbs.slice(0, remainingAbsCount));
                }
                
                planHTML += generateSectionHTML('Abs Finisher (2-3 rounds)', 'tag-abs', selectedAbs);
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
    document.getElementById('printButton').classList.remove('hidden');
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

function getExercisesByMuscles(muscleGroups, count, avoids = new Set(), fitnessLevel = 'intermediate') {
    const difficultyLevels = {
        beginner: ['beginner'],
        intermediate: ['beginner', 'intermediate'],
        advanced: ['beginner', 'intermediate', 'advanced']
    };
    const allowedDifficulties = difficultyLevels[fitnessLevel];
    
    let availableExercises = [];
     Object.entries(exerciseDB).forEach(([group, exercises]) => {
        if (muscleGroups.includes(group)) {
            exercises.forEach(ex => {
                if (!avoids.has(ex.name) && ex.equipment.some(eq => selectedEquipment.has(eq)) && allowedDifficulties.includes(ex.difficulty)) {
                    availableExercises.push(ex);
                }
            });
        }
    });
    return [...availableExercises].sort(() => 0.5 - Math.random()).slice(0, count);
}

function generateDayWorkout(dayType, workoutTime, mustHaves, avoids, fitnessLevel) {
    // --- FINAL, MORE RELIABLE Full Body Logic ---
    if (dayType === 'Full Body') {
        const numExercises = Math.max(6, Math.floor(workoutTime / 7));
        const numLowerTarget = Math.floor(numExercises / 2);
        const numUpperTarget = numExercises - numLowerTarget;

        const getPool = (groups) => {
            const difficultyLevels = {
                beginner: ['beginner'],
                intermediate: ['beginner', 'intermediate'],
                advanced: ['beginner', 'intermediate', 'advanced']
            };
            const allowedDifficulties = difficultyLevels[fitnessLevel];
            let pool = [];
            groups.forEach(group => {
                if (exerciseDB[group]) {
                    exerciseDB[group].forEach(ex => {
                        if (!avoids.has(ex.name) && ex.equipment.some(eq => selectedEquipment.has(eq)) && allowedDifficulties.includes(ex.difficulty)) {
                            pool.push(ex);
                        }
                    });
                }
            });
            return pool.sort(() => 0.5 - Math.random()); // Shuffle the pool
        };

        const upperBodyGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Calisthenics'];
        const lowerBodyGroups = ['Legs', 'Glutes'];
        
        let upperPool = getPool(upperBodyGroups);
        let lowerPool = getPool(lowerBodyGroups);
        
        let selectedUpper = [];
        let selectedLower = [];
        let finalWorkout = [];

        // 1. Add must-haves first
        mustHaves.forEach(name => {
            let upperEx = upperPool.find(ex => ex.name === name);
            let lowerEx = lowerPool.find(ex => ex.name === name);
            if(lowerEx) {
                selectedLower.push(lowerEx);
                lowerPool = lowerPool.filter(ex => ex.name !== name); // Remove from pool
            } else if (upperEx) {
                selectedUpper.push(upperEx);
                upperPool = upperPool.filter(ex => ex.name !== name); // Remove from pool
            }
        });

        // 2. Fill remaining slots from pools
        while(selectedLower.length < numLowerTarget && lowerPool.length > 0) {
            selectedLower.push(lowerPool.shift());
        }
        while(selectedUpper.length < numUpperTarget && upperPool.length > 0) {
            selectedUpper.push(upperPool.shift());
        }

        // 3. Weave them together for alternation, placing isolation last
        const compoundsUpper = selectedUpper.filter(ex => ex.type === 'compound');
        const compoundsLower = selectedLower.filter(ex => ex.type === 'compound');
        const isolations = selectedUpper.filter(ex => ex.type === 'isolation').concat(selectedLower.filter(ex => ex.type === 'isolation'));
        
        let i = 0, j = 0;
        while(i < compoundsLower.length || j < compoundsUpper.length) {
            if(i < compoundsLower.length) finalWorkout.push(compoundsLower[i++]);
            if(j < compoundsUpper.length) finalWorkout.push(compoundsUpper[j++]);
        }
        finalWorkout.push(...isolations); // Add isolations at the end

        if (finalWorkout.length === 0) return `<p>Couldn't find any exercises for this setup! Try changing your preferences or selecting more equipment.</p>`;
        return generateSectionHTML(`Main Lift (Sets: 3-4 | Reps: 8-12)`, 'tag-main', finalWorkout);
    }

    // Original logic for other split types with alternation
    const muscleGroups = {
        'Push': ['Chest', 'Shoulders', 'Arms', 'Calisthenics'],
        'Pull': ['Back', 'Arms', 'Calisthenics'],
        'Legs': ['Legs', 'Glutes'],
        'Upper': ['Chest', 'Back', 'Shoulders', 'Arms', 'Calisthenics'],
        'Lower': ['Legs', 'Glutes'],
    };
    let fullPool = getExercisesByMuscles(muscleGroups[dayType], 200, avoids, fitnessLevel);
    
    let selectedExercises = [];
    // 1. Handle must-haves
    mustHaves.forEach(name => {
        const exIndex = fullPool.findIndex(ex => ex.name === name);
        if(exIndex > -1) {
            selectedExercises.push(fullPool[exIndex]);
            fullPool.splice(exIndex, 1);
        }
    });

    const numExercises = Math.max(5, Math.floor(workoutTime / 7));
    const needed = numExercises - selectedExercises.length;
    
    if(needed > 0) {
        const compounds = fullPool.filter(ex => ex.type === 'compound');
        const isolations = fullPool.filter(ex => ex.type === 'isolation');

        // Alternate compound exercises
        const alternateCompounds = (list) => {
            if(list.length < 2) return list;
            for(let i=0; i < list.length - 1; i++) {
                const currentMuscle = list[i].muscles[0];
                const nextMuscle = list[i+1].muscles[0];
                if(currentMuscle === nextMuscle) {
                    // Find a later exercise to swap with
                    for(let j=i+2; j < list.length; j++) {
                        if(list[j].muscles[0] !== currentMuscle) {
                            [list[i+1], list[j]] = [list[j], list[i+1]]; // Swap
                            break;
                        }
                    }
                }
            }
            return list;
        };
        
        const orderedCompounds = alternateCompounds(compounds);
        
        const numCompounds = Math.min(orderedCompounds.length, Math.max(0, Math.ceil(needed * 0.7)));
        const numIsolations = Math.min(isolations.length, Math.max(0, needed - numCompounds));
        
        selectedExercises.push(...orderedCompounds.slice(0, numCompounds));
        selectedExercises.push(...isolations.slice(0, numIsolations));
    }
    
    if (selectedExercises.length === 0) return `<p>Couldn't find any exercises for this setup! Try changing your preferences or selecting more equipment.</p>`;
    return generateSectionHTML(`Main Lift (Sets: 3-4 | Reps: 8-12)`, 'tag-main', selectedExercises);
}


// --- RELIABLE PRINT FUNCTION ---
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
            ul { margin: 0; padding-left: 20px; list-style-position: inside; }
            ul ul { margin-top: 5px; }
            li { margin-bottom: 5px; }
            li strong { font-weight: bold; }
            p { margin-top: 0; }
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
                     const nextContent = sectionTitle.nextElementSibling;

                     if (sectionTitle.textContent === 'Stretchy Cool-down Ideas' && nextContent && nextContent.classList.contains('exercise-item')) {
                        exercisesHTML += `<li>${nextContent.innerHTML}</li>`;
                     } else {
                        let exerciseList = '<ul>';
                        let currentExerciseItem = nextContent;
                        while(currentExerciseItem && currentExerciseItem.classList.contains('exercise-item')){
                            const exerciseName = currentExerciseItem.querySelector('strong').textContent;
                            const exerciseDetails = currentExerciseItem.querySelector('small') ? `(${currentExerciseItem.querySelector('small').textContent})` : '';
                            exerciseList += `<li>${exerciseName} ${exerciseDetails}</li>`;
                            currentExerciseItem = currentExerciseItem.nextElementSibling;
                        }
                        exerciseList += '</ul>';
                        exercisesHTML += exerciseList;
                     }
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
    container.innerHTML = ''; 

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

// --- Populates new preference dropdowns ---
function populateExercisePreferenceDropdowns() {
    const mustHaveSelect = document.getElementById('mustHaveExercises');
    const avoidSelect = document.getElementById('avoidExercises');

    const allExercises = new Set();
    Object.values(exerciseDB).flat().forEach(ex => allExercises.add(ex.name));

    [...allExercises].sort().forEach(name => {
        const option1 = document.createElement('option');
        option1.value = name;
        option1.textContent = name;
        mustHaveSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = name;
        option2.textContent = name;
        avoidSelect.appendChild(option2);
    });
}


// --- INITIALIZATION ---
window.onload = function() {
    document.getElementById('dateInput').valueAsDate = new Date();
    populateExerciseDropdown();
    populateExercisePreferenceDropdowns();
    renderAllCharts();
    
    // Initialize Select2
    $('#mustHaveExercises, #avoidExercises').select2({
        placeholder: "Click to select exercises",
        allowClear: true
    });
};