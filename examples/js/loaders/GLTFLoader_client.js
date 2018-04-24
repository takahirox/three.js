/**
 * @author Takahiro / https://github.com/takahirox
 */

THREE.GLTFLoader = ( function () {

	/**
	 * optional parameters.
	 * - pathToWorker: path to GLTFLoader_worker.js from main app page
	 * - pathToThree: path to Three.js from GLTFLoader_worker.js
	 * - pathToGLTFLoader: path to GLTFloader.js from GLTFLoader_worker.js
	 * - pathToDRACOLoader: path to DRACOLoader from GLTFLoader_worker.js
	 * - pathToDRACODecoder: path to DRACO decoder directory from GLTFLoader_worker.js
	 * - pathToMainPage: path to main app page diractory from GLTFLoader_worker.js
	 *
	 * default values are
	 * - pathToWorker: './js/loaders/GLTFLoader_worker.js'
	 * - pathToThree: '../../../build/three.js'
	 * - pathToGLTFLoader: './GLTFLoader.js'
	 * - pathToDRACOLoader: './DRACOLoader.js'
	 * - pathToDRACODecoder: '../libs/draco/gltf/'
	 * - pathToMainPage: '../../'
	 *
	 * default values are assuming the following directory structure.
	 * - build/three.js
	 * - examples/
	 *   - app.js
	 *   - js/loaders/
	 *     - GLTFLoader.js
	 *     - GLTFLoader_worker.js
	 *     - DRACOLoader.js
	 *   - libs/draco/gltf/
	 */
	function GLTFLoader( manager, parameters ) {

		parameters = parameters || {};

		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

		this.worker = this.createWorker( parameters.pathToWorker );
		this.worker.postMessage( { command: 'init', parameters: parameters } );

		this.requests = {};
		this.requestId = 0;

	}

	GLTFLoader.prototype = {

		constructor: GLTFLoader,

		createWorker: function ( pathToWorker ) {

			pathToWorker = pathToWorker || './js/loaders/GLTFLoader_worker.js'

			var self = this;

			var worker = new Worker( pathToWorker );

			worker.onmessage = function ( event ) {

				// console.log( event );

				var data = event.data;

				switch ( data.command ) {

					case 'onLoad':

						// deserialization

						var gltf = data.gltf;

						var scenes = [];
						var objectLoader = new TransferredObjectLoader();

						for ( var i = 0, il = gltf.scenes.length; i < il; i ++ ) {

							scenes.push( objectLoader.parse( gltf.scenes[ i ] ) );

						}

						var scene = scenes[ gltf.sceneIndex === -1 ? 0 : gltf.sceneIndex ];

						var animations = [];

						for ( var i = 0, il = gltf.animations.length; i < il; i ++ ) {

							animations.push( THREE.AnimationClip.parse( gltf.animations[ i ] ) );

						}

						// call onLoad

						var request = self.requests[ data.id ];
						delete self.requests[ data.id ];

						request.onLoad( {
							scene: scene,
							scenes: scenes,
							animations: animations
						} );

						break;

					case 'onError':

						var request = self.requests[ data.id ];
						delete self.requests[ data.id ];

						if ( request.onError ) request.onError( data.error );

						break;

				}

			};

			return worker;

		},

		load: function ( url, onLoad, onProgress, onError ) {

			var id = this.requestId ++;

			this.requests[ id ] = {

				onLoad: onLoad,
				onProgress: onProgress,
				onError: onError

			};

			this.worker.postMessage( {
				command: 'load',
				id: id,
				url: url
			} );

		}

	};


	// To deserialize the json serialized in worker, overriding some methods here.

	function TransferredObjectLoader( manager ) {

		THREE.ObjectLoader.call( this, manager );

	}

	TransferredObjectLoader.prototype = Object.assign( Object.create( THREE.ObjectLoader.prototype ), {

		constructor: TransferredObjectLoader,

		parseImages: function ( json, onLoad ) {

			var scope = this;
			var images = {};

			if ( json !== undefined && json.length > 0 ) {

				for ( var i = 0, l = json.length; i < l; i ++ ) {

					var image = json[ i ];

					images[ image.uuid ] = image.bitmap;

				}

			}

			return images;

		},

		parseTextures: function ( json, images ) {

			var textures = THREE.ObjectLoader.prototype.parseTextures.call( this, json, images );

			if ( json !== undefined ) {

				for ( var i = 0, l = json.length; i < l; i ++ ) {

					var data = json[ i ];
					var texture = textures[ data.uuid ];

					if ( texture === undefined ) continue;

					if ( data.encoding !== undefined ) texture.encoding = data.encoding;
					if ( data.type !== undefined ) texture.type = data.type;

				}

			}

			return textures;

		},

		parseGeometries: function ( json, shapes ) {

			var geometries = {};

			if ( json !== undefined ) {

				var bufferGeometryLoader = new TransferredBufferGeometryLoader();

				for ( var i = 0, l = json.length; i < l; i ++ ) {

					var geometry;
					var data = json[ i ];

					switch ( data.type ) {

						case 'BufferGeometry':

							geometry = bufferGeometryLoader.parse( data );

							break;

						default:

							console.warn( 'THREE.TransferredObjectLoader: Unsupported geometry type "' + data.type + '"' );

							continue;

					}

					geometry.uuid = data.uuid;

					if ( data.name !== undefined ) geometry.name = data.name;

					geometries[ data.uuid ] = geometry;

				}

			}

			return geometries;

		},

		parseAnimations: function ( json ) {

			var animations = [];

			for ( var i = 0; i < json.length; i ++ ) {

				var clip = TransferredAnimationClip.parse( json[ i ] );

				animations.push( clip );

			}

			return animations;

		},

	} );

	function TransferredBufferGeometryLoader() {

		THREE.BufferGeometryLoader.call( this );

	}

	TransferredBufferGeometryLoader.prototype = Object.assign( Object.create( THREE.BufferGeometryLoader.prototype ), {

		constructor: TransferredBufferGeometryLoader,

		parse: function ( json ) {

			var geometry = new THREE.BufferGeometry();

			var index = json.data.index;

			if ( index !== undefined ) {

				geometry.setIndex( new THREE.BufferAttribute( index.array, 1 ) );

			}

			var attributes = json.data.attributes;

			for ( var key in attributes ) {

				var attribute = attributes[ key ];

				geometry.addAttribute( key, new THREE.BufferAttribute( attribute.array, attribute.itemSize, attribute.normalized ) );

			}

			var groups = json.data.groups || json.data.drawcalls || json.data.offsets;

			if ( groups !== undefined ) {

				for ( var i = 0, n = groups.length; i !== n; ++ i ) {

					var group = groups[ i ];

					geometry.addGroup( group.start, group.count, group.materialIndex );

				}

			}

			return geometry;

		}

	} );

	return GLTFLoader;

} )();
