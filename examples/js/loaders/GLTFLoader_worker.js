var window = self;

var loader;

var pathToThree = '../../../build/three.js';
var pathToGLTFLoader = './GLTFLoader.js';
var pathToDRACOLoader = './DRACOLoader.js';
var pathToDRACODecoder = '../libs/draco/gltf/';
var pathToMainPage = '../../';

onmessage = function ( event ) {

	var data = event.data;

	switch ( data.command ) {

		case 'init':

			var parameters = data.parameters;

			if ( parameters.pathToThree !== undefined ) pathToThree = parameters.pathToThree;
			if ( parameters.pathToGLTFLoader !== undefined ) pathToGLTFLoader = parameters.pathToGLTFLoader;
			if ( parameters.pathToDRACOLoader !== undefined ) pathToDRACOLoader = parameters.pathToDRACOLoader;
			if ( parameters.pathToDRACODecoder !== undefined ) pathToDRACODecoder = parameters.pathToDRACODecoder;
			if ( parameters.pathToMainPage !== undefined ) pathToMainPage = parameters.pathToMainPage;

			initialize();
			overrideThreeForWorker();
			overrideThreeForSerialization();

			break;

		case 'load':

			var id = data.id;

			loader.load( resolveURL( data.url ), function ( gltf ) {

				// serialization + pick transferable objects.

				var scenesJson = [];
				var animationsJson = [];
				var transferableObjects = [];

				for ( var i = 0, il = gltf.scenes.length; i < il; i ++ ) {

					var scene = gltf.scenes[ i ];
					scene.updateMatrixWorld( true );

					var sceneJson = scene.toJSON();
					scenesJson.push( sceneJson );

					var geometries = sceneJson.geometries;

					if ( geometries ) {

						for ( var j = 0, jl = geometries.length; j < jl; j ++ ) {

							var geometry = geometries[ j ];
							var data = geometry.data;
							var attributes = data.attributes;
							var index = data.index;

							for ( var key in attributes ) {

								var attribute = attributes[ key ];

								if ( transferableObjects.indexOf( attribute.array.buffer ) === - 1 ) {

									transferableObjects.push( attribute.array.buffer );

								}

							}

							if ( index ) {

								if ( transferableObjects.indexOf( index.array.buffer ) === - 1 ) {

									transferableObjects.push( index.array.buffer );

								}

							}

						}

					}

				}

				for ( var i = 0, il = gltf.animations.length; i < il; i ++ ) {

					var animationJson = THREE.AnimationClip.toJSON( gltf.animations[ i ] );

					animationsJson.push( animationJson );

					var tracks = animationJson.tracks;

					for ( var k = 0, kl = tracks.length; k < kl; k ++ ) {

						var track = tracks[ k ];

						if ( transferableObjects.indexOf( track.times.buffer ) === - 1 ) {

							transferableObjects.push( track.times.buffer );

						}

						if ( transferableObjects.indexOf( track.values.buffer ) === - 1 ) {

							transferableObjects.push( track.values.buffer );

						}

					}

				}

				// send message to main thread.
				// note that objects in  transferableObjects will be no longer accessible.

				postMessage( {
					command: 'onLoad',
					id: id,
					gltf: {
						sceneIndex: gltf.scenes.indexOf( gltf.scene ),
						scenes: scenesJson,
						animations: animationsJson
					}
				}, transferableObjects );

			}, undefined, function ( error ) {

				console.error( error );

				postMessage( {
					command: 'onError',
					id: id,
					error: error.message
				} );

			} );

			break;

	}

};


function resolveURL( url ) {

	// Absolute URL http://,https://,file://,//
	if ( /^(((https?)|(file)):)?\/\//i.test( url ) ) return url;

	// Data URI
	if ( /^data:.*,.*$/i.test( url ) ) return url;

	// Blob URL
	if ( /^blob:.*$/i.test( url ) ) return url;

	// Relative URL
	return pathToMainPage + url;

}

function initialize() {

	importScripts( pathToThree );
	importScripts( pathToGLTFLoader );
	importScripts( pathToDRACOLoader );

	loader = new THREE.GLTFLoader();

	THREE.DRACOLoader.setDecoderPath( pathToDRACODecoder );
	loader.setDRACOLoader( new THREE.DRACOLoader() );

}

// Three.js includes the codes which don't run on Worker.
// Overriding methods including such codes here.

function overrideThreeForWorker() {

	Object.assign( THREE.DRACOLoader, {

		_loadScript: function ( src ) {

			importScripts( src );
			return Promise.resolve();

		}

	} );


	Object.assign( THREE.TextureLoader.prototype, {

		load: function ( url, onLoad, onProgress, onError ) {

			var texture = new THREE.Texture();

			// Use ImageBitmapLoader @takahirox
			var loader = new THREE.ImageBitmapLoader( this.manager );
			loader.setCrossOrigin( this.crossOrigin );
			loader.setPath( this.path );

			loader.load( url, function ( image ) {

				texture.image = image;

				// JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
				var isJPEG = url.search( /\.(jpg|jpeg)$/ ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

				texture.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
				texture.needsUpdate = true;

				if ( onLoad !== undefined ) {

					onLoad( texture );

				}

			}, onProgress, onError );

			return texture;

		}

	} );


	Object.assign( THREE.ImageBitmapLoader.prototype, {

		load: function load( url, onLoad, onProgress, onError ) {

			if ( url === undefined ) url = '';

			if ( this.path !== undefined ) url = this.path + url;

			var scope = this;

			var cached = THREE.Cache.get( url );

			if ( cached !== undefined ) {

				scope.manager.itemStart( url );

				setTimeout( function () {

					if ( onLoad ) onLoad( cached );

					scope.manager.itemEnd( url );

				}, 0 );

				return cached;

			}

			fetch( url ).then( function ( res ) {

				return res.blob();

			} ).then( function ( blob ) {

				// Second argument "option" causes an error on FireFox @takahirox
				return createImageBitmap( blob );

			} ).then( function ( imageBitmap ) {

				THREE.Cache.add( url, imageBitmap );

				if ( onLoad ) onLoad( imageBitmap );

				scope.manager.itemEnd( url );

			} ).catch( function ( e ) {

				if ( onError ) onError( e );

				scope.manager.itemEnd( url );
				scope.manager.itemError( url );

			} );

		}

	} );

}


// Overriding Three.js toJSON methods for efficient transfer
// with transferable objects.

function overrideThreeForSerialization() {

	Object.assign( THREE.Texture.prototype, {

		toJSON: function ( meta ) {

			var isRootObject = ( meta === undefined || typeof meta === 'string' );

			if ( ! isRootObject && meta.textures[ this.uuid ] !== undefined ) {

				return meta.textures[ this.uuid ];

			}

			var output = {

				metadata: {
					version: 4.5,
					type: 'Texture',
					generator: 'Texture.toJSON'
				},

				uuid: this.uuid,
				name: this.name,

				// add missing encoding and type serialization @takahirox

				mapping: this.mapping,
				encoding: this.encoding,
				type: this.type,

				repeat: [ this.repeat.x, this.repeat.y ],
				offset: [ this.offset.x, this.offset.y ],
				center: [ this.center.x, this.center.y ],
				rotation: this.rotation,

				wrap: [ this.wrapS, this.wrapT ],

				format: this.format,
				minFilter: this.minFilter,
				magFilter: this.magFilter,
				anisotropy: this.anisotropy,

				flipY: this.flipY

			};

			if ( this.image !== undefined ) {

				// TODO: Move to THREE.Image

				var image = this.image;

				if ( image.uuid === undefined ) {

					image.uuid = THREE.Math.generateUUID(); // UGH

				}

				if ( ! isRootObject && meta.images[ image.uuid ] === undefined ) {

					// save ImageBitmap @takahirox
					meta.images[ image.uuid ] = {
						uuid: image.uuid,
						bitmap: image
					};

				}

				output.image = image.uuid;

			}

			if ( ! isRootObject ) {

				meta.textures[ this.uuid ] = output;

			}

			return output;

		}

	} );


	Object.assign( THREE.BufferGeometry.prototype, {

		toJSON: function () {

			var data = {
				metadata: {
					version: 4.5,
					type: 'BufferGeometry',
					generator: 'BufferGeometry.toJSON'
				}
			};

			// standard BufferGeometry serialization

			data.uuid = this.uuid;
			data.type = this.type;
			if ( this.name !== '' ) data.name = this.name;

			if ( this.parameters !== undefined ) {

				var parameters = this.parameters;

				for ( var key in parameters ) {

					if ( parameters[ key ] !== undefined ) data[ key ] = parameters[ key ];

				}

				return data;

			}

			data.data = { attributes: {} };

			var index = this.index;

			if ( index !== null ) {

				// save TypedArray @takahirox
				data.data.index = {
					type: index.array.constructor.name,
					array: index.array
				};

			}

			var attributes = this.attributes;

			for ( var key in attributes ) {

				var attribute = attributes[ key ];

				// save TypedArray @takahirox
				data.data.attributes[ key ] = {
					itemSize: attribute.itemSize,
					type: attribute.array.constructor.name,
					array: attribute.array,
					normalized: attribute.normalized
				};

			}

			var groups = this.groups;

			if ( groups.length > 0 ) {

				data.data.groups = JSON.parse( JSON.stringify( groups ) );

			}

			return data;

		}

	} );


	Object.assign( THREE.KeyframeTrack, {

		toJSON: function ( track ) {

			var trackType = track.constructor;

			var json;

			// derived classes can define a static toJSON method
			if ( trackType.toJSON !== undefined ) {

				json = trackType.toJSON( track );

			} else {

				// by default, we assume the data can be serialized as-is
				// save TypedArray @takahirox
				json = {

					'name': track.name,
					'times': track.times,
					'values': track.values

				};

				var interpolation = track.getInterpolation();

				if ( interpolation !== track.DefaultInterpolation ) {

					json.interpolation = interpolation;

				}

			}

			json.type = track.ValueTypeName; // mandatory

			return json;

		}

	} );

}
