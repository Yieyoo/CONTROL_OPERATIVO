var simplemaps_countrymap_mapdata={
  main_settings: {
   //General settings
    width: "responsive", //'700' or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#ffffff",
    
    //State defaults
    state_description: "",
    state_color: "#691932",
    state_hover_color: "#3B729F",
    state_url: "",
    border_size: 1.5,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
    //Location defaults
    location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 2,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
    //Label defaults
    label_color: "#FF0000",  // Negro (o un color visible sobre tu fondo)
    background_color: "#FFFFFF",  // Fondo blanco
    label_size: 16,
    label_font: "Arial",
    label_display: "always",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
    //Zoom settings
    zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
    //Popup settings
    popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
    //Advanced settings
    div: "map",
    auto_load: "yes",
    url_new_tab: "no",
    images_directory: "default",
    fade_time: 0.1,
    link_text: "View Website",
    popups: "detect",
    state_image_url: "",
    state_image_position: "",
    location_image_url: ""
    },
  state_specific: {
    MXAGU: {
      name: "Aguascalientes",
      url: "estados/aguascalientes/aguascalientesindex.html" // Ruta relativa desde index.html
    },
    MXBCN: {
      name: "Baja California",
      url: "estados/baja_california/baja_californiaindex.html"
    },
    MXBCS: {
      name: "Baja California Sur",
      url: "estados/baja_california_s/baja_california_surindex.html"
    },
    MXCHH: {
      name: "Chihuahua",
      url: "estados/chihuahua/chihuahuaindex.html"
    },
    MXCAM: {
      name: "Campeche",
      url: "estados/campeche/campecheindex.html"
    },
    MXCOA: {
      name: "Coahuila",
      url: "estados/coahuila/coahuilaindex.html"
    },
    MXCOL: {
      name: "Colima",
      url: "estados/colima/colimaindex.html"
    },
    MXCHP: {
      name: "Chiapas",
      url: "estados/chiapas/chiapasindex.html"
    },
    MXDUR: {
      name: "Durango",
      url: "estados/durango/durangoindex.html"
    },
    MXGTO: {
      name: "Guanajuato",
      url: "estados/guanajuato/guanajuatoindex.html"
    },
    MXGRO: {
      name: "Guerrero",
      url: "estados/guerrero/guerreroindex.html"
    },
    MXHGO: {
      name: "Hidalgo",
      url: "estados/hidalgo/hidalgoindex.html"
    },
    MXJAL: {
      name: "Jalisco",
      url: "estados/jalisco/jaliscoindex.html"
    },
    MXMEX: {
      name: "México",
      url: "estados/estado_de_mexico/estado_de_mexicoindex.html"
    },
    MXMOR: {
      name: "Morelos",
      url: "estados/morelos/morelosindex.html"
    },
    MXNAY: {
      name: "Nayarit",
      url: "estados/nayarit/nayaritindex.html"
    },
    MXNLU: {
      name: "Nuevo León",
      url: "estados/nuevo_leon/nuevo_leonindex.html"
    },
    MXOAX: {
      name: "Oaxaca",
      url: "estados/oaxaca/oaxacaindex.html"
    },
    MXPUE: {
      name: "Puebla",
      url: "estados/puebla/pueblaindex.html"
    },
    MXQUE: {
      name: "Querétaro",
      url: "estados/queretaro/queretaroindex.html"
    },
    MXROO: {
      name: "Quintana Roo",
      url: "estados/quintana_roo/quintana_rooindex.html"
    },
    MXSLP: {
      name: "San Luis Potosí",
      url: "estados/san_luis_potosi/san_luis_potosiindex.html"
    },
    MXSIN: {
      name: "Sinaloa",
      url: "estados/sinaloa/sinaloaindex.html"
    },
    MXSON: {
      name: "Sonora",
      url: "estados/sonora/sonoraindex.html"
    },
    MXTAB: {
      name: "Tabasco",
      url: "estados/tabasco/tabascoindex.html"
    },
    MXTAM: {
      name: "Tamaulipas",
      url: "estados/tamaulipas/tamaulipasindex.html"
    },
    MXTLX: {
      name: "Tlaxcala",
      url: "estados/tlaxcala/tlaxcalaindex.html"
    },
    MXVER: {
      name: "Veracruz",
      url: "estados/veracruz/veracruzindex.html"
    },
    MXYUC: {
      name: "Yucatán",
      url: "estados/yucatan/yucatanindex.html"
    },
    MXZAC: {
      name: "Zacatecas",
      url: "estados/zacatecas/zacatecasindex.html"
    }

    }}