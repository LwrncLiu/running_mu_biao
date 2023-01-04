import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js'

class RigidBody {
    constructor() {
    }

    setRestitution(val) {
        this.body.setRestitution(val)
    }

    setFriction(val) {
        this.body.setFriction(val)
    }

    setRollingFriction(val) {
        this.body.setRollingFriction(val)
    }

    createBox(mass, pos, quat, size) {
        this.transform = new Ammo.btTransform()
        this.transform.setIdentity()
        this.transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z))
        this.transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w))
        this.motionState = new Ammo.btDefaultMotionState(this.transform)

        const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
        this.shape = new Ammo.btBoxShape(btSize)
        this.shape.setMargin(0.05)

        this.inertia = new Ammo.btVector3(0, 0, 0)
        if (mass > 0) {
            this.shape.calculateLocalInertia(mass, this.inertia)
        }

        this.info = new Ammo.btRigidBodyConstructionInfo(
            mass, this.motionState, this.shape, this.inertia
        )
        this.body = new Ammo.btRigidBody(this.info)

        Ammo.destroy(btSize)
    }
}

class World {
    constructor(num_bricks) {
        this.default_mass = 10
        this.num_bricks = num_bricks
    }

    initialize() {
        // AMMO PHYSICAL WORLD INIT
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration()
        this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration)
        this.broadphase = new Ammo.btDbvtBroadphase()
        this.solver = new Ammo.btSequentialImpulseConstraintSolver()
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            this.dispatcher,
            this.broadphase,
            this.solver,
            this.collisionConfiguration
        )
        // gravity with a negative value on the y-axis
        this.physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0))
    
        // THREEJS INIT
        // scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x6e9b8e)

        // lights
        const topRightLight = new THREE.DirectionalLight(0xFFFFFF, 1.0)
        topRightLight.intensity = 1.2
        topRightLight.position.set(20, 30, -25)
        topRightLight.target.position.set(0, 0, 0)
        topRightLight.castShadow = true
        this.scene.add(topRightLight)

        const ambientLight = new THREE.AmbientLight(0x404040)
        this.scene.add(ambientLight)

        // ground 
        const groundDimension = {
            width: 200,
            height: 1,
            depth: 200
        }
        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(groundDimension.width, groundDimension.height, groundDimension.depth),
            new THREE.ShadowMaterial()
        )
        ground.castShadow = false
        ground.receiveShadow = false
        this.scene.add(ground)

        // create an ammo rigid body for ground
        const rbGround = new RigidBody()
        rbGround.createBox(0, ground.position, ground.quaternion, new THREE.Vector3(groundDimension.width, groundDimension.height, groundDimension.depth))
        rbGround.setRestitution(0.99)
        this.physicsWorld.addRigidBody(rbGround.body)

        // camera
        const fov = 45
        const aspect = innerWidth / innerHeight
        const near = 1.0
        const far = 1000.0
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        this.camera.position.set(100, 45, -40)
        
        this.renderer = new THREE.WebGLRenderer({antialias: true})
        this.renderer.shadowMap.enabled = true
        this.renderer.setPixelRatio(devicePixelRatio)
        this.renderer.setSize(innerWidth, innerHeight)

        document.body.appendChild(this.renderer.domElement)
        
        // add orbit controls
        const controls = new OrbitControls(
            this.camera, this.renderer.domElement
        )
        controls.target.set(0, 20, 0)
        controls.update()

        // vars for animation
        this.rigidBodies = []
        this.tmpTransform = new Ammo.btTransform()
        this.countdown = 1.0
        this.count = 0
        this.previousFrame = null
        this.animate()

    }

    onWindowResize() {
        this.camera.aspect = innerWidth/innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(innerWidth, innerHeight)
    }

    animate() {
        requestAnimationFrame((t) => {
            if (this.previousFrame === null) {
                this.previousFrame = t
            }

            this.step(t - this.previousFrame)
            this.renderer.render(this.scene, this.camera)
            this.animate()
            this.previousFrame = t
        })
    }

    step(timeElapsed) {
        const timeElapsedSeconds = timeElapsed * 0.001
        this.countdown -= timeElapsedSeconds
        if (this.countdown < 0 && this.count < 3) {
            this.countdown = 0.25
            this.count += 1
            this.spawn()
        }

        this.physicsWorld.stepSimulation(timeElapsedSeconds, 10)

        for (let i = 0; i < this.rigidBodies.length; ++i) {
            this.rigidBodies[i].rigidBody.motionState.getWorldTransform(this.tmpTransform)
            const pos = this.tmpTransform.getOrigin()
            const quat = this.tmpTransform.getRotation()
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z())
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w())
            
            this.rigidBodies[i].mesh.position.copy(pos3)
            this.rigidBodies[i].mesh.quaternion.copy(quat3)
        }
    }

    spawn() {
        const brickDimension = {
            width: 5, 
            height: 3,
            depth: 10
        }

        // create three.js brick
        const brick = new THREE.Mesh(
            new THREE.BoxGeometry(brickDimension.width, brickDimension.height, brickDimension.depth),
            new THREE.MeshStandardMaterial({color: 0xAA4A44})
        )
        brick.position.set((Math.random() - 0.5) * 30, 200.0, (Math.random() - 0.5) * 30)
        brick.quaternion.set(0, 0, 0, 1)
        brick.castShadow = true
        brick.receiveShadow = true

        // create ammo rigid body brick
        const rb = new RigidBody()
        rb.createBox(this.default_mass, brick.position, brick.quaternion, new THREE.Vector3(brickDimension.width, brickDimension.height, brickDimension.depth))
        rb.setRestitution(0.125)
        rb.setFriction(1)
        rb.setRollingFriction(5)

        this.physicsWorld.addRigidBody(rb.body)

        this.rigidBodies.push({mesh: brick, rigidBody: rb})

        this.scene.add(brick)   
    }
}


let APP = null 

window.addEventListener('DOMContentLoaded', async() => {
    Ammo().then((lib) => {
        Ammo = lib
        APP = new World()
        APP.initialize()
    })
})