//initialise simplex noise instance
var noise = new SimplexNoise();
// the main visualiser function
var vizInit = function () {

    var file = document.getElementById("thefile");
    var audio = document.getElementById("audio");
    var fileLabel = document.querySelector("label.file");

    document.onload = function (e) {
        console.log(e);
        audio.play();
        play();
    }
    file.onchange = function () {
        fileLabel.classList.add('normal');
        audio.classList.add('active');
        var files = this.files;

        audio.src = URL.createObjectURL(files[0]);
        audio.load();
        audio.play();
        play();
    }

    function play() {
        var context = new AudioContext();
        var src = context.createMediaElementSource(audio);
        var analyser = context.createAnalyser();
        src.connect(analyser);
        analyser.connect(context.destination);
        analyser.fftSize = 512;
        var bufferLength = analyser.frequencyBinCount;
        var dataArray = new Uint8Array(bufferLength);

        //here comes the webgl
        var scene = new THREE.Scene();
        var group = new THREE.Group();
        var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 100);
        camera.lookAt(scene.position);
        scene.add(camera);
        // Setup camera controller
        //const controls = new THREE.OrbitControls(camera);

        var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        var planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
        const waterTexture = new THREE.TextureLoader().load('Free-Water-Texture.jpg');
        var planeMaterial = new THREE.MeshLambertMaterial({
            map: waterTexture,
            wireframe: true,
            side: THREE.DoubleSide,
        });

        var plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.5 * Math.PI;
        plane.position.set(0, 30, 0);
        group.add(plane);

        var plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
        plane2.rotation.x = -0.5 * Math.PI;
        plane2.position.set(0, -30, 0);
        group.add(plane2);




        const geometry = new THREE.BufferGeometry();

        // Here are the 'base' vertices of a normalized triangle
        const baseTriangle = [
            new THREE.Vector3(-0.5, 0.5, 0),
            new THREE.Vector3(0.5, 0.5, 0),
            new THREE.Vector3(-0.5, -0.5, 0),
        ];

        // A set of different colors we can choose from
        const hexColors = ['#ffc0cb', '#FFB6C1', '#FF69B4', '#DB7093'];

        const positions = [];
        const colors = [];
        const particles = 150;

        for (let i = 0; i < particles; i++) {
            // Clone the verts, let's do some adjustments
            let vertices = baseTriangle.map(p => p.clone());

            // vertices *= triangleScale
            const triangleScale = Math.random() * 1.1;
            vertices = vertices.map(p => p.multiplyScalar(triangleScale));

            // Get a random offset within -1..1 box
            const offset = new THREE.Vector3(
                Math.random() * 3 - 1,
                Math.random() * 3 - 1,
                Math.random() * 3 - 1
            );
            vertices = vertices.map(p => p.add(offset));

            // apply a random Euler xyz rotation
            const randomRotation = new THREE.Euler(
                (Math.random() * 3 - 1) * Math.PI * 2,
                (Math.random() * 3 - 1) * Math.PI * 2,
                (Math.random() * 3 - 1) * Math.PI * 2
            );
            vertices = vertices.map(p => p.applyEuler(randomRotation));

            // And now turn this into an array of arrays
            vertices = vertices.map(p => p.toArray());

            // And lastly 'flatten' it so its just a list of xyz numbers
            vertices = vertices.flat();

            // Concat those into the final array of positions
            positions.push(...vertices);

            // And give this face (3 vertices) a color
            const hex = hexColors[Math.floor(Math.random() * hexColors.length)];
            const color = new THREE.Color(hex);
            for (let c = 0; c < 3; c++) {
                colors.push(color.r, color.g, color.b);
            }
        }

        const positionAttribute = new THREE.BufferAttribute(
            new Float32Array(positions),
            3
        );
        geometry.addAttribute("position", positionAttribute);

        const colorAttribute = new THREE.BufferAttribute(new Float32Array(colors), 3);
        geometry.addAttribute("color", colorAttribute);

        // Enable vertex colors on the material
        const material = new THREE.MeshBasicMaterial({
            vertexColors: THREE.VertexColors,
            side: THREE.DoubleSide
        });

        // Create a mesh
        var design = new THREE.Mesh(geometry, material);
        design.position.set(0, 0, 0);
        design.scale.setScalar(3);
        group.add(design);

        var ambientLight = new THREE.AmbientLight(0xaaaaaa);
        scene.add(ambientLight);

        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.intensity = 0.9;
        spotLight.position.set(-10, 40, 20);
        spotLight.lookAt(design);
        spotLight.castShadow = true;
        scene.add(spotLight);

        scene.add(group);

        document.getElementById('out').appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize, false);

        render();

        function render() {
            analyser.getByteFrequencyData(dataArray);

            var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
            var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

            var overallAvg = avg(dataArray);
            var lowerMax = max(lowerHalfArray);
            var lowerAvg = avg(lowerHalfArray);
            var upperMax = max(upperHalfArray);
            var upperAvg = avg(upperHalfArray);

            var lowerMaxFr = lowerMax / lowerHalfArray.length;
            var lowerAvgFr = lowerAvg / lowerHalfArray.length;
            var upperMaxFr = upperMax / upperHalfArray.length;
            var upperAvgFr = upperAvg / upperHalfArray.length;

            makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
            makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

            makeRoughBall(design, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));

            group.rotation.y += 0.005;
            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(render);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function makeRoughBall(mesh, bassFr, treFr) {

            mesh.scale.setScalar(treFr * 1.8 + bassFr * 1.1);
            mesh.geometry.verticesNeedUpdate = true;
            mesh.geometry.normalsNeedUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeFaceNormals();
        }

        function makeRoughGround(mesh, distortionFr) {
            mesh.geometry.vertices.forEach(function (vertex, i) {
                var amp = 1.5;
                var time = Date.now();
                var distance = (noise.noise2D(vertex.x + time * 0.0003, vertex.y + time * 0.0001) + 0) * distortionFr * amp;
                vertex.z = distance;
            });
            mesh.geometry.verticesNeedUpdate = true;
            mesh.geometry.normalsNeedUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeFaceNormals();
        }

        audio.play();
    };
}

window.onload = vizInit();

document.body.addEventListener('touchend', function (ev) { context.resume(); });




//some helper functions here
function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr) {
    var total = arr.reduce(function (sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); })
}