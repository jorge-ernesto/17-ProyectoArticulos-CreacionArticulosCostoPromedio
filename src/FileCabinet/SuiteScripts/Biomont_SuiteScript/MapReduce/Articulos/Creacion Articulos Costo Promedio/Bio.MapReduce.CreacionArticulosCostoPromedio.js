// Notas del archivo:
// - Secuencia de comando:
//      - Biomont MR Creacion Articulos Cos. Prom. (customscript_bio_mr_creartcospro)

/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N'],

    (N) => {

        const { log, file, record } = N;

        /**
         * Archivos CSV
         *
         * 424235: Plantilla de Migración.csv
         * 426102: TEST02_04 Para Jorge.csv
         */

        /******************/

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {

            // Declarar varibales
            let data = [];

            // Leer archivo
            const fileId = 495528;
            const csvFile = file.load({ id: fileId });
            const contents = csvFile.getContents();
            const rows = contents.split('\n');

            // Recorrer data
            data = rows.map(line => {
                let array = line.split(';');
                let cleanedArray = array.map(item => item.trim());
                return {
                    internalid: cleanedArray[0],
                    name: cleanedArray[1],
                    display_name: cleanedArray[2],
                    purchase_description: cleanedArray[3],
                    costing_method: cleanedArray[4],
                    wip_cost_variance_account: cleanedArray[5],
                    type: cleanedArray[6],
                    bio_cam_linea: cleanedArray[7]
                }
            });

            log.debug('data', data);
            return data;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {

            // Obtener data
            let value = JSON.parse(mapContext.value);
            let articulo_internalid = Number(value.internalid);
            let articulo_itemid = value.name;
            let articulo_displayname = value.display_name;
            let articulo_purchasedescription = value.purchase_description;
            let articulo_costingmethod = 'AVG';
            let articulo_wipvarianceacct = 6686;

            try {
                // Validar data
                if (articulo_internalid) {

                    // Debug
                    log.debug('value', value);

                    /****************** Creacion de articulos para costo promedio ******************/
                    // Cargar el registro original
                    const originalRecord = record.load({
                        type: 'lotnumberedassemblyitem',
                        id: articulo_internalid,
                        defaultValues: {
                            customform: 148
                        },
                        isDynamic: true
                    });

                    // Crear una copia del registro
                    const copiedRecord = record.copy({
                        type: 'lotnumberedassemblyitem',
                        id: articulo_internalid,
                        defaultValues: {
                            customform: 148
                        },
                        isDynamic: true
                    });

                    // Modificar la copia si es necesario
                    // CHECKBOX CORRELATIVO AUTOMATICO
                    copiedRecord.setValue({
                        fieldId: 'custitem_bio_articulo_correlativo_auto',
                        value: false
                    });
                    // NAME -- Codigo del articulo
                    copiedRecord.setValue({
                        fieldId: 'itemid',
                        value: articulo_itemid
                    });
                    // DISPLAY NAME -- Descripcion del articulo
                    copiedRecord.setValue({
                        fieldId: 'displayname',
                        value: articulo_displayname
                    });
                    // PURCHASE DESCRIPCION -- Descripcion de la venta
                    copiedRecord.setValue({
                        fieldId: 'purchasedescription',
                        value: articulo_purchasedescription
                    });
                    // STOCK DESCRIPCION -- Descripcion de stock
                    // copiedRecord.setValue({
                    //     fieldId: 'stockdescription',
                    //     value: 'Stock Description'
                    // });
                    // COSTING METHOD -- Metodo de calculos de costos
                    copiedRecord.setValue({
                        fieldId: 'costingmethod',
                        value: articulo_costingmethod
                    });
                    // WIP COST VARIANCE ACCOUNT --
                    copiedRecord.setValue({
                        fieldId: 'wipvarianceacct',
                        value: articulo_wipvarianceacct
                    });

                    // Guardar la copia como un nuevo registro
                    let copiedRecordId = copiedRecord.save();
                    log.debug('copiedRecordId', copiedRecordId);
                }
            } catch (err) {
                log.error('Map', err);
            }
        }

        return { getInputData, map }

    });
