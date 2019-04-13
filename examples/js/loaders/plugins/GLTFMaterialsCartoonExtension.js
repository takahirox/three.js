THREE.GLTFMaterialsCartoonExtension = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	function GLTFMaterialsCartoonExtension() {

		Plugin.call( this, 'EXT_cartoon' );

	}

	GLTFMaterialsCartoonExtension.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFMaterialsCartoonExtension,

		onMaterial: function ( materialDef, materialParams, parser ) {

			var extensions = materialDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) {

				return null;

			}

			var pending = [];

			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;

			materialParams.shininess = 0;

			var metallicRoughness = materialDef.pbrMetallicRoughness;

			if ( metallicRoughness ) {

				if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

					var array = metallicRoughness.baseColorFactor;

					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( metallicRoughness.baseColorTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

				}

			}

			var gradientTexture = extensions[ this.name ].gradientTexture;

			if ( gradientTexture ) {

				pending.push( parser.assignTexture( materialParams, 'gradientMap', gradientTexture ).then( function ( map ) {

					map.minFilter = THREE.NearestFilter;
					map.magFilter = THREE.NearestFilter;

					return map;

				} ) );

			}

			return Promise.all( pending ).then( function () {

				return new THREE.MeshToonMaterial( materialParams );

			} );

		}

	} );

	return GLTFMaterialsCartoonExtension;

} )();
