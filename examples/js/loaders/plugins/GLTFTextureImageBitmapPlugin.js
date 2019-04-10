THREE.GLTFTextureImageBitmapPlugin = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	function GLTFTextureImageBitmapPlugin( manager ) {

		Plugin.call( this, 'THREE_texture_imagebitmap' );

		this.textureLoader = new CustomTextureLoader( manager );

	}

	GLTFTextureImageBitmapPlugin.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFTextureImageBitmapPlugin,

		onTexture: function ( textureDef, parser ) {

			return parser.loadTextureFile( parser.json.images[ textureDef.source ], this.textureLoader );

		}

	} );

	function CustomTextureLoader( manager ) {

		THREE.TextureLoader.call( this, manager );

	}

	CustomTextureLoader.prototype = Object.assign( Object.create( THREE.TextureLoader.prototype ), {

		constructor: CustomTextureLoader,

		load: function ( url, onLoad, onProgress, onError ) {

			var texture = new THREE.Texture();

			var loader = new THREE.ImageBitmapLoader( this.manager );
			loader.setCrossOrigin( this.crossOrigin );
			loader.setPath( this.path );

			loader.load( url, function ( image ) {

				texture.image = image;

				// JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
				var isJPEG = url.search( /\.jpe?g($|\?)/i ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

				texture.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
				texture.needsUpdate = true;

				if ( onLoad !== undefined ) {

					onLoad( texture );

				}

			}, onProgress, onError );

			return texture;

		}

	} );

	return GLTFTextureImageBitmapPlugin;

} )();
