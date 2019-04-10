/**
 * @author Takahiro / https://github.com/takahirox
 */

// VRM Specification: https://dwango.github.io/vrm/vrm_spec/
//
// VRM is based on glTF 2.0 and VRM extension is defined
// in top-level json.extensions.VRM

THREE.VRMLoader = ( function () {

	function VRMLoader( gltfLoader ) {

		this.manager = gltfLoader.manager;
		this.gltfLoader = gltfLoader
			.registerPlugin( 'VRM', new VRMExtension() );

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

		setDRACOLoader: function ( dracoLoader ) {

			this.glTFLoader.setDRACOLoader( dracoLoader );
			return this;

		}

	};

	var Plugin = THREE.GLTFLoader.Plugin;

	function VRMExtension() {

		Plugin.call( this, 'VRM' );

	}

	VRMExtension.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: VRMExtension,

		onBeforeGLTF: function ( gltfDef, parser ) {

			if ( ! gltfDef.extensions || ! gltfDef.extensions[ this.name ] ) return gltfDef;

			var vrm = gltfDef.extensions[ this.name ];

			var materialDefs = gltfDef.materials;
			var materialProperties = vrm.materialProperties || [];

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

			var VRMDef = extensions[ this.name ];
			var shader = VRMDef.shader;

			if ( shader !== 'VRM/UnlitTexture' && shader !== 'VRM/UnlitTransparent' ) return null;

			var json = parser.json;
			var textureProperties = VRMDef.textureProperties;
			var mapDef = { index: textureProperties._MainTex };

			var pending = [];

			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;

			pending.push( parser.assignTexture( materialParams, 'map', mapDef ) );

			return Promise.all( pending ).then( function () {

				var material = new THREE.MeshBasicMaterial( materialParams );

				if ( material.map ) material.map.encoding = THREE.sRGBEncoding;

				return material;

			} );

		}

	} );

	return VRMLoader;

} )();
