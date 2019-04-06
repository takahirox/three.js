/**
 * @author Takahiro / https://github.com/takahirox
 */

// VRM Specification: https://dwango.github.io/vrm/vrm_spec/
//
// VRM is based on glTF 2.0 and VRM extension is defined
// in top-level json.extensions.VRM

THREE.VRMLoader = ( function () {

	if ( THREE.GLTFLoader === undefined ) {

		throw new Error( 'THREE.VRMLoader: Import THREE.GLTFLoader first.' );

	}

	function VRMLoader( manager ) {

		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
		this.gltfLoader = new THREE.GLTFLoader( this.manager )
			.registerExtension( 'VRM', new VRMExtension() );

	}

	VRMLoader.prototype = {

		constructor: VRMLoader,

		crossOrigin: 'anonymous',

		load: function ( url, onLoad, onProgress, onError ) {

			this.gltfLoader.load( url, onLoad, onProgress, onError );

		},

		setCrossOrigin: function ( value ) {

			this.glTFLoader.setCrossOrigin( value );
			return this;

		},

		setPath: function ( value ) {

			this.glTFLoader.setPath( value );
			return this;

		},

		setResourcePath: function ( value ) {

			this.glTFLoader.setResourcePath( value );
			return this;

		},

		registerExtension: function ( name, extension ) {

			this.glTFLoader.registerExtension( name, extension );
			return this;

		},

		parse: function ( data, path, onLoad, onError ) {

			this.gltfLoader.parse( data, path, onLoad, onError );

		}

	};

	function VRMExtension() {

		THREE.GLTFLoader.GLTFExtension.call( this, 'VRM' );

	}

	VRMExtension.prototype = Object.assign( Object.create( THREE.GLTFLoader.GLTFExtension.prototype ), {

		constructor: VRMExtension,

		onBeforeGLTF: function ( gltfDef, parser ) {

			var gltfParser = parser;
			var extensions = gltfDef.extensions || {};
			var vrmExtension = extensions[ this.name ] || {};

			// console.log( gltfDef );
			// console.log( vrmExtension );

			var materialDefs = gltfDef.materials;
			var materialProperties = vrmExtension.materialProperties || [];

			for ( var i = 0, il = materialProperties.length; i < il; i ++ ) {

				var materialDef = materialDefs[ i ];
				var property = materialProperties[ i ];

				if ( materialDef.extensions === undefined ) materialDef.extensions = {};

				materialDef.extensions[ this.name ] = property;

			}

			return gltfDef;

		},

		onMaterial: function ( materialDef, materialParams, parser ) {

			var extensions = materialDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) {

				return null;

			}

			var json = parser.json;
			var VRMDef = extensions[ this.name ];
			var textureProperties = VRMDef.textureProperties;
			var mapDef = { index: textureProperties._MainTex };

			var pending = [];

			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;

			pending.push( parser.assignTexture( materialParams, 'map', mapDef ) );

			return Promise.all( pending );

		},

		getMaterialType: function ( materialDef ) {

			var extensions = materialDef.extensions;
			var VRMDef = extensions[ this.name ];
			var shader = VRMDef.shader;

			switch ( shader ) {

				case 'VRM/UnlitTexture':
				case 'VRM/UnlitTransparent':

					return THREE.MeshBasicMaterial;

				default:

					return THREE.MeshStandardMaterial;


			}

		}

	} );

	return VRMLoader;

} )();
