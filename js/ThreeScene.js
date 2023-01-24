let container, renderer, scene;

const universeImage = 'texture/universe.jpg'
const sunImage = 'texture/sun.jpg'
const earthImage = 'texture/earth.jpg'
const moonImage = 'texture/moon.jpg'

// Scene objects
let physicalObjects = [];
let universe, sun, earth, moon;
let moonRotation, moonTrajectory, moonTrajectoryLine;

//Light
let sunLight;
let ambientLight;

//Time
let clock = new THREE.Clock();
let prevDate = Date.now();
let deltatime = 0;
let gameTime = 0;
let maxTime = 5.5 * 60; //Default
let currentTime;
let timerInterval;
let intervalSet = false;
let completeTime = 0;

// Camera
let camera;
let cameraDistance = 1200
let cameraZoomSpeed = 200;

// Interaction
let controls;
let cameraControls;
let keyboard;
let inputInited = false;
let controller;
let hasEnded = false;

// Leaderboard
let leaderboard = {
    "brano": 10,
    "mima": 11,
    "stanci": 30,
    "pista": 40,
    "ado": 50,
    "martin": 60,
    "anca": 70,
    "maria": 80,
    "jano": 90,
    "jozo": 100,
}

// Physics
const G = 6.674e-1;
let world;
let physicalMaterial;
let gravityThreshold = 1.0;

//Solar system - gravity/physics
let solarSystem;
let earthRadius = 500;
let moonRadius = 200;
let moonDistance = 500;
let moonRevolveSpeed = 0.01
let planetVisualRotationSpeed = 0.1;
let earthMass = 2.5e7;
let moonMass = 2.5e6;
let atmosphereHeight = 500;
let airFriction = 0.5;

// Aircraft
let aircraft, aircraftAsset = new THREE.Object3D();
let startPos = new CANNON.Vec3(0, 20, 0);
let thrust, wantsRotateZPos, wantsRotateZNeg, wantsRotateXPos, wantsRotateXNeg, wantsRotateYPos,
    wantsRotateYNeg = false;
let rotatedZPos, rotatedZNeg, rotatedXPos, rotatedXNeg, rotatedYPos, rotatedYNeg = false;
let thrustIntensity = 250.0;
let arrowHelper;
let aircraftDryMass = 1.0;
let maxAircraftSpeed = 2000;
let bottomEngine

let rotationX = 0,
    rotationY = 0,
    rotationZ = 0

//Loaders
let textureLoader, gltfLoader, dracoLoader;

//Wait to load whole page
window.onload = () => {
    localStorage.setItem("leaderboard", JSON.stringify(leaderboard))
    init();
    render();
}

//https://sbcode.net/view_source/physics-cannon-debug-renderer.html
function Cube(name, sizeX, sizeY, sizeZ, position, physicalMaterial, visMat, mass) {
    //Name
    this.name = name;

    //Add Visual object to universe
    this.cubeGeometry = new THREE.CubeGeometry(sizeX, sizeY, sizeZ);
    this.visual = new THREE.Mesh(this.cubeGeometry, visMat)
    this.visual.position.copy(position)
    this.visual.castShadow = true
    scene.add(this.visual);

    //Add Physical object to universe
    this.sphereShape = new CANNON.Box(new CANNON.Vec3(sizeX / 2, sizeY / 2, sizeZ / 2));
    this.body = new CANNON.Body({ mass: mass, material: physicalMaterial })
    this.body.addShape(this.sphereShape)
    this.body.position.copy(position)
    this.body.linearDamping = 0;
    this.body.angularDamping = 0;

    world.addBody(this.body);

    this.gravityDir = new CANNON.Vec3(0, 0, 0);
    this.enabled = true;

    this.body.physicalObject = this;
    this.visual.physicalObject = this;

    physicalObjects.push(this);
}

//https://sbcode.net/view_source/physics-cannon-debug-renderer.html
function Sphere(name, radius, position, physicalMaterial, visualMaterial, mass) {
    //Name
    this.name = name;

    mesh = new THREE.MeshStandardMaterial({
        map: textureLoader.load(visualMaterial),
        roughness: 1.0,
        side: THREE.DoubleSide
    });

    //Add Visual object to universe
    this.sphereGeometry = new THREE.SphereGeometry(radius, 50, 50)
    this.visual = new THREE.Mesh(this.sphereGeometry, mesh)
    this.visual.position.copy(position)
    this.visual.castShadow = true
    scene.add(this.visual);

    //Add Physical object to universe
    this.sphereShape = new CANNON.Sphere(radius)
    this.body = new CANNON.Body({ mass: mass, material: physicalMaterial })
    this.body.addShape(this.sphereShape)
    this.body.position.copy(position)
    this.body.linearDamping = 0;
    this.body.angularDamping = 0;

    world.addBody(this.body);

    this.gravityDir = new CANNON.Vec3(0, 0, 0);
    this.enabled = true;

    this.body.physicalObject = this;
    this.visual.physicalObject = this;

    physicalObjects.push(this);
}

function SphereWithoutBody(name, radius, position, physicalMaterial, visualMaterial) {
    //Name
    this.name = name;

    mesh = new THREE.MeshStandardMaterial({
        map: textureLoader.load(visualMaterial),
        roughness: 1.0,
        side: THREE.DoubleSide
    });

    //Add Visual object to universe
    this.sphereGeometry = new THREE.SphereGeometry(radius, 50, 50)
    this.visual = new THREE.Mesh(this.sphereGeometry, mesh)
    this.visual.position.copy(position)
    this.visual.castShadow = true
    scene.add(this.visual);
}

function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    gltfLoader = new THREE.GLTFLoader();
    dracoLoader = new THREE.DRACOLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    container = document.getElementById("nekonecnyVesmir");
    container.appendChild(renderer.domElement);

    textureLoader = new THREE.TextureLoader();

    //Init everything
    addMenuListeners();
    addFinalListeners()
    initPhysics();
    addObjects();
    addLight()
    initCamera();
    initControls();
    addGui();
}

function initControls() {
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement)
    cameraControls.enablePan = false
    cameraControls.enableDamping = true
    cameraControls.dampingFactor = 1
    cameraControls.update()
}

function addObjects() {
    // Axis
    scene.add(new THREE.AxisHelper(5));

    universe = new SphereWithoutBody("Universe", 40000, new THREE.Vector3(0, 0, 0), physicalMaterial, universeImage, 0.0);
    sun = new SphereWithoutBody("Sun", 3000, new THREE.Vector3(15000, 0, 0), physicalMaterial, sunImage, 0.0);
    earth = new Sphere("Earth", earthRadius, new THREE.Vector3(0, 0, 0), physicalMaterial, earthImage, 0.0);
    moon = new Sphere("Moon", moonRadius, new THREE.Vector3(0, moonDistance * 2, 0), physicalMaterial, moonImage, 0.0);

    //Solar system
    solarSystem = new THREE.Object3D();
    //Earth to be below 0,0,0
    solarSystem.position.y = -earthRadius;
    solarSystem.add(earth.visual);

    //Moon - trajectory line
    moonTrajectory = new THREE.EllipseCurve(0, 0, 1500, 1500);
    moonTrajectoryLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(moonTrajectory.getSpacedPoints(100)), new THREE.LineBasicMaterial({
        color: "white"
    }));
    //Rotate horizontally
    moonTrajectoryLine.rotation.x = Math.PI * -0.5
    moonTrajectoryLine.position.y = moonDistance
    scene.add(moonTrajectoryLine);

    //Create moon as 3D object so we can move around position
    moonRotation = new THREE.Object3D();
    moonRotation.add(moon.visual);
    solarSystem.add(moonRotation);

    //Add solar system to scene
    scene.add(solarSystem);

    //Load rocket
    gltfLoader.load("models/aircraft/rocket.glb",
        function(gltf) {
            aircraftAsset = gltf.scene;
            setupRocket(aircraftAsset)

        }
    )
    matchPhysicalObject(earth);
    matchPhysicalObject(moon);

}

function addLight() {
    //Sun light
    sunLight = new THREE.PointLight(0xffffff, 1.2, 0, 2);
    sunLight.position.set(10000, 0, 0)
    scene.add(sunLight)

    //Ambient Light
    ambientLight = new THREE.AmbientLight(0x808080);
    scene.add(ambientLight);
}

function setupRocket(aircraftAsset) {
    aircraftAsset.position.y = -80.0;
    aircraftAsset.position.x = 3.5;
    aircraftAsset.scale.set(10, 10, 10);

    const material = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, opacity: 0.1, transparent: true })

    aircraft = new Cube("aircraft", 20.0, 40.0, 20.0, new CANNON.Vec3(0, 0, 0).copy(startPos), physicalMaterial, material, aircraftDryMass + 1.0);
    aircraft.visual.add(aircraftAsset);

    //Bottom engine
    bottomEngine = new THREE.Mesh(new THREE.ConeGeometry(5, 30, 8), new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    }));
    bottomEngine.position.y = -20;
    bottomEngine.visible = false;
    aircraft.visual.add(bottomEngine);

    // To make camera follow aircraft
    aircraft.visual.add(camera)

    arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 0), 30.0, 0xffff00);
    scene.add(arrowHelper);

    aircraft.body.addEventListener("collide", collision);

}

function addGui() {
    controller = {
        trajectory: false,
        arrowHelper: false,
    }

    let gui = new dat.GUI();

    let g3 = gui.addFolder("Nastavenie");
    g3.add(controller, 'trajectory').name('Zobraz trajektorie');
    g3.add(controller, 'arrowHelper').name('Zobraz smer rakety');

    //Hide dat gui so only menu is visible
    dat.GUI.toggleHide()
}

function initCamera() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000000);
    camera.position.set(0, 0, 500)
}

function initInput() {
    //Don't init twice
    if (inputInited)
        return
    else
        inputInited = true

    keyboard = new THREEx.KeyboardState();

    //Keyboard
    keyboard.domElement.addEventListener('keydown', function(event) {
        startTimer()
        if (!hasEnded) {
            if (keyboard.eventMatches(event, 'w') || keyboard.eventMatches(event, 'up')) {
                onUpPress()
            }
            if (keyboard.eventMatches(event, 'a') || keyboard.eventMatches(event, 'left')) {
                onLeftPress();
            }
            if (keyboard.eventMatches(event, 's') || keyboard.eventMatches(event, 'down')) {
                onDownPress()
            }
            if (keyboard.eventMatches(event, 'd') || keyboard.eventMatches(event, 'right')) {
                onRightPress();
            }
            if (keyboard.eventMatches(event, 'q')) {
                onQPress()
            }
            if (keyboard.eventMatches(event, 'e')) {
                onEPress();
            }
            if (keyboard.eventMatches(event, 'r')) {
                onRestartPress();
            }
            if (keyboard.eventMatches(event, 'space')) {
                onThrustPress();
            }
        }
    })

    keyboard.domElement.addEventListener('keyup', function(event) {
        if (keyboard.eventMatches(event, 'w') || keyboard.eventMatches(event, 'up')) {
            onUpRelease();
        }
        if (keyboard.eventMatches(event, 'a') || keyboard.eventMatches(event, 'left')) {
            onLeftRelease();
        }
        if (keyboard.eventMatches(event, 'd') || keyboard.eventMatches(event, 'right')) {
            onRightRelease();
        }
        if (keyboard.eventMatches(event, 's') || keyboard.eventMatches(event, 'down')) {
            onDownRelease();
        }
        if (keyboard.eventMatches(event, 'q')) {
            onQRelease()
        }
        if (keyboard.eventMatches(event, 'e')) {
            onERelease();
        }
        if (keyboard.eventMatches(event, 'space')) {
            onThrustRelease();
        }
    })
}

function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    physicalMaterial = new CANNON.Material({
        name: 'physicalMaterial',
        friction: 0.9,
        restitution: 0.3
    });
}

function addMenuListeners() {
    //HARD BUTTON
    document.getElementById("hard").addEventListener("mouseover", (e) => {
        document.getElementById("hard").innerHTML = "1 minute"
    })
    document.getElementById("hard").addEventListener("mouseleave", (e) => {
        document.getElementById("hard").innerHTML = "HARD"
    })
    document.getElementById("hard").addEventListener("click", (e) => {
        maxTime = 1 * 60;
        start()
    })


    //MEDIUM BUTTON
    document.getElementById("medium").addEventListener("mouseover", (e) => {
        document.getElementById("medium").innerHTML = "2:30 minutes"
    })
    document.getElementById("medium").addEventListener("mouseleave", (e) => {
        document.getElementById("medium").innerHTML = "MEDIUM"
    })
    document.getElementById("medium").addEventListener("click", (e) => {
        maxTime = 2.5 * 60;
        start()
    })


    //EASY BUTTON
    document.getElementById("easy").addEventListener("mouseover", (e) => {
        document.getElementById("easy").innerHTML = "5:30 minutes"
    })
    document.getElementById("easy").addEventListener("mouseleave", (e) => {
        document.getElementById("easy").innerHTML = "EASY"
    })
    document.getElementById("easy").addEventListener("click", (e) => {
        maxTime = 5.5 * 60;
        start()
    })
    printLeaderboard()
}

function addFinalListeners() {
    document.getElementById("finalButton").addEventListener("click", (e) => {
        document.getElementById("menuWrap").style.visibility = "visible";
        document.getElementById("leaderboard").style.visibility = "visible";
        document.getElementById("final").style.visibility = "hidden";
        restart();
    })
    document.getElementById("submit").addEventListener("click", (e) => {
        document.getElementById("menuWrap").style.visibility = "visible";
        document.getElementById("leaderboard").style.visibility = "visible";
        document.getElementById("final").style.visibility = "hidden";
        restart();
    })
}

function start() {
    currentTime = maxTime;
    initInput();
    document.getElementById("menuWrap").style.visibility = "hidden";
    document.getElementById("leaderboard").style.visibility = "hidden";
    document.getElementById("info").style.visibility = "visible";
    document.getElementById("timer").style.visibility = "visible";
    document.getElementById("timerText").innerHTML = maxTime;
    dat.GUI.toggleHide();
}

function render() {
    requestAnimationFrame(render);
    update();

    renderer.clear();
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}

function update() {
    deltaTime = (Date.now() - prevDate) / 1000;
    gameTime += deltaTime;

    //Solárny systém
    updateSolarSystem()

    //Fyzika
    world.step(deltaTime);
    for (let i = 0; i < physicalObjects.length; i++) {
        if (physicalObjects[i].enabled) {
            updateGravity(physicalObjects[i]);
            matchPhysicalObject(physicalObjects[i]);
        }
    }

    // Vznasadlo
    if (aircraft != null)
        updateAircraft();

    // Nastavenia
    updateController(controller);

    cameraControls.update()

    prevDate = Date.now();
}

function updateTimer() {
    currentTime -= 1;
    document.getElementById("timerText").innerHTML = currentTime
    if (currentTime <= 0) {
        clearInterval(timerInterval)
        lost();
    }
}

function lost() {
    restart()
    intervalSet = false

    document.getElementById("info").style.visibility = "hidden";
    document.getElementById("timer").style.visibility = "hidden";
    document.getElementById("final").style.visibility = "visible";
    document.getElementById("leaderboard").style.visibility = "visible";
    document.getElementById("form").style.visibility = "hidden";
    document.getElementById("finalText").innerHTML = "You lost!";
    dat.GUI.toggleHide();
}

function updateSolarSystem() {
    let rotationOnTrajectoryTime = (clock.getElapsedTime() * moonRevolveSpeed) % 1;
    let v = new THREE.Vector3();
    moonTrajectory.getPointAt(rotationOnTrajectoryTime, v)
    moonRotation.position.x = v.x;
    moonRotation.position.z = v.y;
    moon.visual.rotation.y -= planetVisualRotationSpeed * deltaTime;
    earth.visual.rotation.y -= planetVisualRotationSpeed * deltaTime;
}

function rotateAircraft(axis, direction, rotation) {
    aircraft.body.angularVelocity = new CANNON.Vec3(0, 0, 0)

    let angle = Math.PI / 200

    if (direction === "-") angle *= -1

    rotation += angle

    // creating new rotation quaternion and multiplying with current to get new quaternion of result rotation
    let factorQuaternion = new CANNON.Quaternion()
    let newQuaternion = new CANNON.Quaternion()
    newQuaternion.copy(aircraft.body.quaternion)

    factorQuaternion.setFromAxisAngle(axis, angle)
    newQuaternion.mult(factorQuaternion, newQuaternion)

    aircraft.body.quaternion.copy(newQuaternion)

    return rotation
}

function updateAircraft() {
    aircraft.body.angularVelocity.y = 0;

    //Allow only MaxAircraftSpeed - Aby sa rýchlosť v závislosti dĺžky vektora nezvyšovala konštantne ale bola limitovana
    limitAircraftSpeed()

    // ArrowHelper - Smer rakety
    let dir = new CANNON.Vec3(0, 0, 0);
    dir.copy(aircraft.body.velocity);

    let length = 10.0 + dir.length();

    dir.normalize();
    arrowHelper.setDirection(dir);
    arrowHelper.setLength(length);
    arrowHelper.position.copy(aircraft.visual.position);

    //Rotation of rocket
    if (wantsRotateZPos && !rotatedZPos) {
        rotationZ = rotateAircraft(new CANNON.Vec3(0, 0, 1), "+", rotationZ)
    }

    if (wantsRotateZNeg && !rotatedZNeg) {
        rotationZ = rotateAircraft(new CANNON.Vec3(0, 0, 1), "-", rotationZ)
    }

    if (wantsRotateXPos && !rotatedXPos) {
        rotationX = rotateAircraft(new CANNON.Vec3(1, 0, 0), "+", rotationX)
    }

    if (wantsRotateXNeg && !rotatedXNeg) {
        rotationX = rotateAircraft(new CANNON.Vec3(1, 0, 0), "-", rotationX)
    }

    if (wantsRotateYPos && !rotatedYPos) {
        rotationY = rotateAircraft(new CANNON.Vec3(0, 1, 0), "+", rotationY)
    }

    if (wantsRotateYNeg && !rotatedYNeg) {
        rotationY = rotateAircraft(new CANNON.Vec3(0, 1, 0), "-", rotationY)
    }

    //When flying - držanie medzernika
    if (thrust) {
        aircraft.body.applyLocalForce(new CANNON.Vec3(0, 1, 0).scale(thrustIntensity), new CANNON.Vec3(0, 0, 0));
        bottomEngine.visible = true;
    } else {
        bottomEngine.visible = false;
    }

    aircraft.body.mass = aircraftDryMass;

    updateAircraftDrag()
}

function limitAircraftSpeed() {
    if (aircraft.body.velocity.length() > maxAircraftSpeed) {
        aircraft.body.velocity.normalize();
        aircraft.body.velocity = aircraft.body.velocity.scale(maxAircraftSpeed);
    }
}

function updateAircraftDrag() {
    let distanceToEarth = earth.body.position.vsub(aircraft.body.position).length();
    let distanceToMoon = moon.body.position.vsub(aircraft.body.position).length();

    if (distanceToEarth < earthRadius + 20.0) aircraft.body.linearDamping = 0.8;
    else if (distanceToEarth < earthRadius + atmosphereHeight) {
        let heightLerp = lerp(earthRadius, earthRadius + atmosphereHeight, distanceToEarth);
        aircraft.body.linearDamping = (1.0 - heightLerp) * airFriction;
    } else aircraft.body.linearDamping = 0.0;

    if (distanceToMoon < moonRadius + 20.0) aircraft.body.linearDamping = 0.8;
    else if (distanceToMoon < moonRadius + atmosphereHeight) {
        let heightLerp = lerp(moonRadius, moonRadius + atmosphereHeight, distanceToMoon);
        aircraft.body.linearDamping = (1.0 - heightLerp) * airFriction;
    } else aircraft.body.linearDamping = 0.0;
}

function updateGravity(physicalObject) {
    let earthDistance = earth.body.position.vsub(physicalObject.body.position);
    let moonDistance = moon.body.position.vsub(physicalObject.body.position);
    let distanceToEarth = earthDistance.length()
    let distanceToMoon = moonDistance.length()

    let earthGravity = (G * earthMass) / Math.pow(distanceToEarth, 2);
    if (earthGravity < gravityThreshold) earthGravity = 0.0;

    let moonGravity = (G * moonMass) / Math.pow(distanceToMoon, 2);
    if (moonGravity < gravityThreshold) moonGravity = 0.0;

    let earthImpluse_a = earthDistance;
    earthImpluse_a.normalize();
    let earthImpluse = earthImpluse_a.scale(earthGravity);

    let moonImpluse_a = moonDistance
    moonImpluse_a.normalize();
    let moonImpulse = moonImpluse_a.scale(moonGravity);

    let totalImpulse = earthImpluse.vadd(moonImpulse);

    physicalObject.body.velocity = physicalObject.body.velocity.vadd(totalImpulse.scale(deltaTime));
    physicalObject.gravityLength = totalImpulse.length();
    physicalObject.gravityDir.copy(totalImpulse);
    physicalObject.gravityDir.normalize();
}

function getDistance(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)
}

function updateController(controller) {
    moonTrajectoryLine.visible = controller.trajectory;

    if (aircraft != null && controller.arrowHelper)
        arrowHelper.visible = true
    else if (aircraft != null)
        arrowHelper.visible = false
}

function matchPhysicalObject(physicalObject) {
    if (physicalObject.body.mass > 0) {
        physicalObject.visual.position.copy(physicalObject.body.position);
        physicalObject.visual.quaternion.copy(physicalObject.body.quaternion);
    } else {
        let visualPos = new THREE.Vector3();
        let visualRot = new THREE.Quaternion();
        physicalObject.visual.getWorldPosition(visualPos);
        physicalObject.visual.getWorldQuaternion(visualRot);
        physicalObject.body.position.copy(visualPos);
        physicalObject.body.quaternion.copy(visualRot);
    }
}

function collision(event) {
    if (event.body.physicalObject.name === "Moon") {
        aircraft.body.velocity = new CANNON.Vec3(0, 0, 0);
        aircraft.body.angularVelocity = new CANNON.Vec3(0, 0, 0);
        if (intervalSet && !hasEnded)
            win()
    }
}

function win(time) {
    hasEnded = true
    completeTime = maxTime - currentTime
    clearInterval(timerInterval)
    intervalSet = false
    document.getElementById("info").style.visibility = "hidden";
    document.getElementById("timer").style.visibility = "hidden";
    document.getElementById("final").style.visibility = "visible";
    document.getElementById("finalText").innerHTML = "You won!";
    dat.GUI.toggleHide();
}

function createRow(index, name, score) {
    let row = document.createElement('div');
    row.setAttribute("class", "row")

    name_el = document.createElement('div');
    name_el.innerHTML = `${index + 1}.   ${name}   ${score}`;

    row.appendChild(name_el)

    return row;
}

function printLeaderboard() {
    let lb_el = document.getElementById("leaderboard")
    lb_el.innerHTML = ''

    let title = document.createElement('div');
    title.innerHTML = "Leaderboard:"

    lb_el.appendChild(title)

    let lb = JSON.parse(localStorage.getItem("leaderboard"))
    keys = Object.keys(lb)
    values = Object.values(lb)
    for (let i = 0; i < 10; i++) {
        lb_el.appendChild(createRow(i, keys[i], values[i]))
    }
    let top3 = Array.prototype.slice.call(lb_el.children, 1, 4)
    top3[0].style.color = "gold"
    top3[1].style.color = "silver"
    top3[2].style.color = "#cd7f32"
}

function writeToLeaderboard(name) {
    if (name == '') {
        return
    }
    document.getElementById('name').value = ''

    let lb = JSON.parse(localStorage.getItem("leaderboard"))

    lb[name] = completeTime;

    let leaderboardArray = Object.entries(lb);

    leaderboardArray.sort((a, b) => a[1] - b[1]);
    leaderboardArray.pop();

    let sortedLeaderboard = Object.fromEntries(leaderboardArray);

    localStorage.setItem("leaderboard", JSON.stringify(sortedLeaderboard))

    console.log(Object.entries(sortedLeaderboard))
    printLeaderboard()
}

function lerp(min, max, value) {
    let l = (value - min) / (max - min);
    return Math.min(Math.max(l, 0.0), 1.0);
}

function restart() {
    hasEnded = false
    aircraft.body.position.copy(startPos);
    aircraft.body.quaternion = new CANNON.Quaternion();

    camera.position.set(0, 0, 500)
    aircraft.body.velocity = new CANNON.Vec3(0, 0, 0);
    aircraft.body.angularVelocity = new CANNON.Vec3(0, 0, 0);
}

function onMouseWheel(e) {
    if (e.deltaY > 0 && cameraDistance < MAX_CAMERA_DISTANCE)
        cameraDistance += cameraZoomSpeed;
    else if (e.deltaY < 0 && cameraDistance > MIN_CAMERA_DISTANCE)
        cameraDistance -= cameraZoomSpeed;
}

function startTimer() {
    if (!intervalSet)
        timerInterval = setInterval(updateTimer, 1000);
    intervalSet = true
}

function onUpPress() {
    wantsRotateXNeg = true;
}

function onUpRelease() {
    wantsRotateXNeg = false;
    rotatedXNeg = false;
}

function onDownPress() {
    wantsRotateXPos = true;
}

function onDownRelease() {
    wantsRotateXPos = false;
    rotatedXPos = false;
}

function onLeftPress() {
    wantsRotateZPos = true;
}

function onLeftRelease() {
    wantsRotateZPos = false;
    rotatedZPos = false;
}

function onRightPress() {
    wantsRotateZNeg = true;
}

function onRightRelease() {
    wantsRotateZNeg = false;
    rotatedZNeg = false;
}

function onQPress() {
    wantsRotateYNeg = true;
}

function onQRelease() {
    wantsRotateYNeg = false;
    rotatedYNeg = false;
}

function onEPress() {
    wantsRotateYPos = true;
}

function onERelease() {
    wantsRotateYPos = false;
    rotatedYPos = false;
}

function onThrustPress() {
    thrust = true;
}

function onThrustRelease() {
    thrust = false;
}

function onRestartPress() {
    restart()
}