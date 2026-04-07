import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'

interface ScannerParams {
  storeName?: string
  planId?: string
}

export default function ScannerScreen() {
  const router = useRouter()
  const params = useLocalSearchParams() as unknown as ScannerParams
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = React.useState(false)

  function handleBarCodeScanned({ data }: BarcodeScanningResult) {
    if (scanned || !data) return
    setScanned(true)
    router.replace({
      pathname: '/scanner/confirm',
      params: {
        upc: data,
        storeName: params.storeName ?? '',
        planId: params.planId ?? '',
      },
    })
  }

  if (!permission) {
    return <View style={styles.centered} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera permission required to scan barcodes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with cutout hint */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.hint}>Point camera at a grocery barcode</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const WINDOW_SIZE = 260
const CORNER_SIZE = 24
const CORNER_THICKNESS = 3

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#000',
  },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permissionBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: WINDOW_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: 20,
  },

  scanWindow: { width: WINDOW_SIZE, height: WINDOW_SIZE, position: 'relative' },

  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#22c55e' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },

  hint: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12, minHeight: 44,
  },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
