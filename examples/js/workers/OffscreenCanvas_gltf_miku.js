self.importScripts( '../../../build/three.js' );
self.importScripts( '../loaders/GLTFLoader.js' );

self.importScripts( '../libs/ammo.js' );
self.importScripts( '../animation/CCDIKSolver.js' );
self.importScripts( '../animation/MMDPhysics.js' );
self.importScripts( '../animation/MMDAnimationHelper.js' );
self.importScripts( '../effects/OutlineEffect.js' );

var window = self;

THREE.TextureLoader.prototype.load = function ( url, onLoad, onProgress, onError ) {

	var texture = new THREE.Texture();

	var loader = new THREE.ImageBitmapLoader( this.manager );
	loader.setCrossOrigin( this.crossOrigin );
	loader.setPath( this.path );

	loader.load( url, function ( image ) {

		texture.image = image;

		// JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
		var isJPEG = url.search( /\.jpe?g$/i ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

		texture.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
		texture.needsUpdate = true;

		if ( onLoad !== undefined ) {

			onLoad( texture );

		}

	}, onProgress, onError );

	return texture;

};

THREE.CubeTextureLoader.prototype.load = function ( urls, onLoad, onProgress, onError ) {

	var texture = new THREE.CubeTexture();

	var loader = new THREE.ImageBitmapLoader( this.manager );
	loader.setCrossOrigin( this.crossOrigin );
	loader.setPath( this.path );

	var loaded = 0;

	function loadTexture( i ) {

		loader.load( urls[ i ], function ( image ) {

			texture.images[ i ] = image;

			loaded ++;

			if ( loaded === 6 ) {

				texture.needsUpdate = true;

				if ( onLoad ) onLoad( texture );

			}

		}, undefined, onError );

	}

	for ( var i = 0; i < urls.length; ++ i ) {

		loadTexture( i );

	}

	return texture;

};


self.onmessage = function ( message ) {

	var data = message.data;
	init( data.drawingSurface, data.width, data.height, data.pixelRatio );

};

var camera, scene, renderer, mesh, clock;
var effect, helper;

function init( offscreen, width, height, pixelRatio ) {

	clock = new THREE.Clock();

	camera = new THREE.PerspectiveCamera( 45, width / height, 1, 2000 );
	camera.position.z = 30;

	scene = new THREE.Scene();

	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var directionalLight = new THREE.DirectionalLight( 0xFFFFFF );
	directionalLight.position.set( 0, 0, 1 );
	scene.add( directionalLight );

	var path = '../../textures/cube/Park2/';
	var format = '.jpg';
	var urls = [
		path + 'posx' + format, path + 'negx' + format,
		path + 'posy' + format, path + 'negy' + format,
		path + 'posz' + format, path + 'negz' + format
	];

	var envMap = new THREE.CubeTextureLoader().load( urls, undefined, undefined, console.log );
	envMap.format = THREE.RGBFormat;

	scene.background = envMap;

	helper = new THREE.MMDAnimationHelper( { afterglow: 2.0 } );

	var loader = new THREE.GLTFLoader();

	loader.load( '../../models/gltf/Miku/glTF/scene.gltf', function ( gltf ) {

		mesh = gltf.scene.children[ 0 ];
		mesh.position.y = - 10;

		gltf.scene.traverse( function ( object ) {

			if ( object.material !== undefined ) {

				object.material.envMap = envMap;
				object.material.needsUpdate = true;

			}

		} );

		var animation = gltf.animations[ 0 ];

		helper.add( mesh, {
			animation: animation,
			physics: true
		} );

		scene.add( gltf.scene );

		animate();

	} );

	renderer = new THREE.WebGLRenderer( { antialias: true, canvas: offscreen } );
	renderer.setPixelRatio( pixelRatio );
	renderer.setSize( width, height, false );
	renderer.gammaOutput = true;
	renderer.physicallyCorrectLights = true;

	effect = new THREE.OutlineEffect( renderer );

}

var count = 0;
var previousTime = performance.now();

function animate() {

	helper.update( clock.getDelta() );
	effect.render( scene, camera );

	if ( ++ count === 60 ) {

		var time = performance.now();
		var elapsedTime = time - previousTime;
		var fps = 1000.0 * 60 / elapsedTime;

		previousTime = time;
		count = 0;

		self.postMessage( { fps: fps } );

	}

	if ( self.requestAnimationFrame ) {

		self.requestAnimationFrame( animate );

	} else if ( renderer.context.commit ) {

		// Deprecated

		renderer.context.commit().then( animate );

	}

}
