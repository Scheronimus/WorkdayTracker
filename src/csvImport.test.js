import assert from 'node:assert/strict'
import test from 'node:test'
import { importWorkdaysFromCsv } from './csvImport.js'

const headers = 'Workday ID,Workday Date,Leave Home Time,Customer Name,Arrival Time,Departure Time,Kilometres From Previous Stop,Arrive Home Time,Kilometres From Last Customer To Home'

test('imports and groups legacy rows into workdays', () => {
  const result = importWorkdaysFromCsv(`${headers}
123,2026-07-28,08:00:00,"Acme, S.L.",08:30:00,09:15:00,12.5,10:30:00,8
123,2026-07-28,08:00:00,Second customer,09:30:00,10:00:00,4,10:30:00,8`)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, '123')
  assert.equal(result[0].visits.length, 2)
  assert.equal(result[0].visits[0].name, 'Acme, S.L.')
  assert.equal(result[0].kilometresHome, 8)
  assert.equal(result[0].note, '')
})

test('accepts Spanish headers and current notes', () => {
  const result = importWorkdaysFromCsv(`ID de jornada,Fecha de jornada,Hora de salida de casa,Nombre del cliente,Hora de llegada,Hora de salida,Kilómetros desde la parada anterior,Hora de llegada a casa,Kilómetros desde el último cliente hasta casa,Nota del día
456,2026-07-27,07:30:00,Cliente,08:00:00,09:00:00,10,09:30:00,5,"Revisión, urgente"`)

  assert.equal(result[0].note, 'Revisión, urgente')
})

test('infers midnight rollover for overnight workdays', () => {
  const result = importWorkdaysFromCsv(`${headers}
789,2026-07-27,22:00:00,Night customer,23:00:00,01:00:00,10,02:00:00,5`)

  assert.equal((new Date(result[0].visits[0].leftAt) - new Date(result[0].leftHomeAt)) / 3600000, 3)
  assert.equal((new Date(result[0].arrivedHomeAt) - new Date(result[0].leftHomeAt)) / 3600000, 4)
})

test('rejects unrelated and malformed files', () => {
  assert.throws(() => importWorkdaysFromCsv('Name,Value\nA,1'), /unsupportedCsv/)
  assert.throws(() => importWorkdaysFromCsv(`${headers}\n123,invalid,08:00:00,A,08:30:00,09:00:00,1,10:00:00,2`), /invalidTimestamp/)
})
