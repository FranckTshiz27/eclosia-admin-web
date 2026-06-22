import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CommuneOption, CommuneService } from '../../../services/commune.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CityOption, CityService } from '../../../services/city.service';
import { CountryOption, CountryService } from '../../../services/country.service';
import { GroupApiResponse, GroupService } from '../../../services/group.service';
import { ReferenceDataService, SchoolTypeOption } from '../../../services/reference-data.service';
import { CreateSchoolDto, SchoolApiResponse, SchoolService, UpdateSchoolDto } from '../../../services/school.service';
import { StateOption, StateService } from '../../../services/state.service';

type SchoolStatus = 'Actif' | 'Inactif';

interface SchoolItem {
  id: string | number;
  avatarClass: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  groupName: string;
  motto: string;
  description: string;
  country: string;
  province: string;
  city: string;
  commune: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  directorName: string;
  directorPhone: string;
  directorEmail: string;
  capacity: number;
  classCount: number;
  createdAt: string;
  logo?: string;
  status: SchoolStatus;
}

interface SchoolForm {
  code: string;
  name: string;
  shortName: string;
  type: string;
  groupName: string;
  motto: string;
  description: string;
  country: string;
  province: string;
  city: string;
  commune: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  directorName: string;
  directorPhone: string;
  directorEmail: string;
  capacity: string;
  classCount: string;
  createdAt: string;
  logo: string;
  status: SchoolStatus;
}

@Component({
  selector: 'app-ecole',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecole.component.html',
  styleUrl: './ecole.component.css'
})
export class EcoleComponent implements OnInit {
  searchTerm = '';
  isModalOpen = false;
  isDetailsDrawerOpen = false;
  isEditMode = false;
  isSubmitted = false;
  isSchoolTypeDropdownOpen = false;
  isGroupDropdownOpen = false;
  isSaving = false;
  isCountryDropdownOpen = false;
  isProvinceDropdownOpen = false;
  isCityDropdownOpen = false;
  isCommuneDropdownOpen = false;
  editingSchoolId: string | number | null = null;
  isLoadingCountries = false;
  isLoadingStates = false;
  isLoadingCities = false;
  isLoadingCommunes = false;
  isLoadingSchoolTypes = false;
  isLoadingSchools = false;
  countries: CountryOption[] = [];
  groups: GroupApiResponse[] = [];
  states: StateOption[] = [];
  cities: CityOption[] = [];
  communes: CommuneOption[] = [];
  schoolTypes: SchoolTypeOption[] = [];
  countryLoadError = '';
  groupLoadError = '';
  stateLoadError = '';
  cityLoadError = '';
  communeLoadError = '';
  schoolTypeLoadError = '';
  schoolLoadError = '';
  saveError = '';
  selectedSchool: SchoolItem | null = null;
  private readonly invalidSchoolLogos = new Set<string>();
  private schoolApiRows: SchoolApiResponse[] = [];

  schools: SchoolItem[] = [];

  form: SchoolForm = this.createEmptyForm();

  constructor(
    private readonly cityService: CityService,
    private readonly communeService: CommuneService,
    private readonly countryService: CountryService,
    private readonly groupService: GroupService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly schoolService: SchoolService,
    private readonly stateService: StateService
  ) {}

  ngOnInit(): void {
    this.loadSchools();
    this.loadCities();
    this.loadCommunes();
    this.loadCountries();
    this.loadGroups();
    this.loadSchoolTypes();
    this.loadStates();
  }

  get filteredSchools(): SchoolItem[] {
    const term = this.normalize(this.searchTerm);
    if (!term) {
      return this.schools;
    }
    return this.schools.filter((school) => this.normalize(school.name).includes(term));
  }

  get filteredStateOptions(): StateOption[] {
    if (!this.form.country.trim()) {
      return this.states;
    }

    const selectedCountry = this.countries.find(
      (country) => this.normalize(country.name) === this.normalize(this.form.country)
    );

    if (!selectedCountry) {
      return this.states;
    }

    return this.states.filter((state) => {
      const byCountryName =
        state.countryName && this.normalize(state.countryName) === this.normalize(selectedCountry.name);
      const byCountryCode =
        selectedCountry.iso2 &&
        state.countryCode &&
        this.normalize(state.countryCode) === this.normalize(selectedCountry.iso2);
      return Boolean(byCountryName || byCountryCode);
    });
  }

  get filteredCountryOptions(): CountryOption[] {
    return this.countries;
  }

  get filteredGroupOptions(): GroupApiResponse[] {
    return this.groups;
  }

  get filteredSchoolTypeOptions(): SchoolTypeOption[] {
    return this.schoolTypes;
  }

  get filteredCityOptions(): CityOption[] {
    if (!this.form.province.trim()) {
      return this.cities;
    }

    const selectedState = this.filteredStateOptions.find(
      (state) => this.normalize(state.name) === this.normalize(this.form.province)
    );

    if (!selectedState) {
      return this.cities;
    }

    return this.cities.filter((city) => {
      const sameProvinceId =
        city.provinceId !== undefined &&
        selectedState.id !== undefined &&
        String(city.provinceId) === String(selectedState.id);
      return sameProvinceId;
    });
  }

  get filteredCommuneOptions(): CommuneOption[] {
    if (!this.form.city.trim()) {
      return this.communes;
    }

    const selectedCity = this.filteredCityOptions.find(
      (city) => this.normalize(city.name) === this.normalize(this.form.city)
    );

    if (!selectedCity) {
      return this.communes;
    }

    return this.communes.filter((commune) => {
      const sameCity =
        commune.cityId !== undefined &&
        selectedCity.id !== undefined &&
        String(commune.cityId) === String(selectedCity.id);
      return sameCity;
    });
  }

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.editingSchoolId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
  }

  openEditModal(school: SchoolItem): void {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.editingSchoolId = school.id;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.toForm(school);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingSchoolId = null;
    this.isSubmitted = false;
    this.saveError = '';
    this.closeAllDropdowns();
    this.form = this.createEmptyForm();
  }

  openDetailsDrawer(school: SchoolItem): void {
    this.selectedSchool = school;
    this.isDetailsDrawerOpen = true;
  }

  closeDetailsDrawer(): void {
    this.isDetailsDrawerOpen = false;
    this.selectedSchool = null;
  }

  openCountryDropdown(): void {
    this.isCountryDropdownOpen = true;
  }

  closeCountryDropdown(): void {
    setTimeout(() => {
      this.isCountryDropdownOpen = false;
    }, 120);
  }

  selectCountry(countryName: string): void {
    this.form.country = countryName;
    this.form.province = '';
    this.form.city = '';
    this.form.commune = '';
    this.isCountryDropdownOpen = false;
  }

  openGroupDropdown(): void {
    this.isGroupDropdownOpen = true;
  }

  closeGroupDropdown(): void {
    setTimeout(() => {
      this.isGroupDropdownOpen = false;
    }, 120);
  }

  selectGroup(groupName: string): void {
    this.form.groupName = groupName;
    this.isGroupDropdownOpen = false;
  }

  openSchoolTypeDropdown(): void {
    this.isSchoolTypeDropdownOpen = true;
  }

  closeSchoolTypeDropdown(): void {
    setTimeout(() => {
      this.isSchoolTypeDropdownOpen = false;
    }, 120);
  }

  selectSchoolType(label: string): void {
    this.form.type = label;
    this.isSchoolTypeDropdownOpen = false;
  }

  openProvinceDropdown(): void {
    this.isProvinceDropdownOpen = true;
  }

  closeProvinceDropdown(): void {
    setTimeout(() => {
      this.isProvinceDropdownOpen = false;
    }, 120);
  }

  selectProvince(provinceName: string): void {
    this.form.province = provinceName;
    this.form.city = '';
    this.form.commune = '';
    this.isProvinceDropdownOpen = false;
  }

  openCityDropdown(): void {
    this.isCityDropdownOpen = true;
  }

  closeCityDropdown(): void {
    setTimeout(() => {
      this.isCityDropdownOpen = false;
    }, 120);
  }

  selectCity(cityName: string): void {
    this.form.city = cityName;
    this.form.commune = '';
    this.isCityDropdownOpen = false;
  }

  openCommuneDropdown(): void {
    this.isCommuneDropdownOpen = true;
  }

  closeCommuneDropdown(): void {
    setTimeout(() => {
      this.isCommuneDropdownOpen = false;
    }, 120);
  }

  selectCommune(communeName: string): void {
    this.form.commune = communeName;
    this.isCommuneDropdownOpen = false;
  }

  saveSchool(formRef: NgForm): void {
    this.isSubmitted = true;
    if (!formRef.valid || this.isSaving) {
      formRef.control.markAllAsTouched();
      return;
    }

    if (this.isEditMode && this.editingSchoolId !== null) {
      const schoolId = this.toPersistedSchoolId(this.editingSchoolId);
      if (!schoolId) {
        this.saveError = "Impossible de mettre a jour cette ecole: identifiant invalide.";
        return;
      }

      this.isSaving = true;
      this.saveError = '';
      const dto = this.toUpdateSchoolDto();
      this.schoolService.update(schoolId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadSchools(false);
        },
        error: () => {
          this.isSaving = false;
          this.saveError = "Echec de mise a jour de l'ecole. Verifiez l'API puis reessayez.";
        }
      });
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    const dto = this.toCreateSchoolDto();
    this.schoolService.create(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadSchools(false);
      },
      error: () => {
        this.isSaving = false;
        this.saveError = "Echec de creation de l'ecole. Verifiez l'API puis reessayez.";
      }
    });
  }

  private createEmptyForm(): SchoolForm {
    return {
      code: '',
      name: '',
      shortName: '',
      type: '',
      groupName: '',
      motto: '',
      description: '',
      country: '',
      province: '',
      city: '',
      commune: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      directorName: '',
      directorPhone: '',
      directorEmail: '',
      capacity: '',
      classCount: '',
      createdAt: '',
      logo: '',
      status: 'Actif'
    };
  }

  private toForm(school: SchoolItem): SchoolForm {
    return {
      code: school.code,
      name: school.name,
      shortName: school.shortName,
      type: school.type,
      groupName: school.groupName,
      motto: school.motto,
      description: school.description,
      country: school.country,
      province: school.province,
      city: school.city,
      commune: school.commune,
      address: school.address,
      latitude: school.latitude,
      longitude: school.longitude,
      phone: school.phone,
      altPhone: school.altPhone,
      email: school.email,
      website: school.website,
      directorName: school.directorName,
      directorPhone: school.directorPhone,
      directorEmail: school.directorEmail,
      capacity: String(school.capacity),
      classCount: String(school.classCount),
      createdAt: school.createdAt,
      logo: school.logo || '',
      status: school.status
    };
  }

  private toItemFromForm(): Omit<SchoolItem, 'id'> {
    return {
      avatarClass: 'avatar-blue',
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      shortName: this.form.shortName.trim(),
      type: this.form.type.trim(),
      groupName: this.form.groupName.trim(),
      motto: this.form.motto.trim(),
      description: this.form.description.trim(),
      country: this.form.country.trim(),
      province: this.form.province.trim(),
      city: this.form.city.trim(),
      commune: this.form.commune.trim(),
      address: this.form.address.trim(),
      latitude: this.form.latitude.trim(),
      longitude: this.form.longitude.trim(),
      phone: this.form.phone.trim(),
      altPhone: this.form.altPhone.trim(),
      email: this.form.email.trim(),
      website: this.form.website.trim(),
      directorName: this.form.directorName.trim(),
      directorPhone: this.form.directorPhone.trim(),
      directorEmail: this.form.directorEmail.trim(),
      capacity: Number(this.form.capacity) || 0,
      classCount: Number(this.form.classCount) || 0,
      createdAt: this.form.createdAt.trim(),
      logo: this.form.logo.trim() || undefined,
      status: this.form.status
    };
  }

  private toCreateSchoolDto(): CreateSchoolDto {
    return {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      shortName: this.form.shortName.trim() || undefined,
      description: this.form.description.trim() || undefined,
      motto: this.form.motto.trim() || undefined,
      groupId: this.findGroupIdByName(this.form.groupName),
      countryId: this.findCountryIdByName(this.form.country),
      stateId: this.findStateIdByName(this.form.province),
      cityId: this.findCityIdByName(this.form.city),
      communeId: this.findCommuneIdByName(this.form.commune),
      address: this.form.address.trim() || undefined,
      latitude: this.toDecimal(this.form.latitude),
      longitude: this.toDecimal(this.form.longitude),
      schoolType: this.resolveSchoolTypeCode(this.form.type),
      email: this.form.email.trim() || undefined,
      phone: this.form.phone.trim() || undefined,
      alternatePhone: this.form.altPhone.trim() || undefined,
      website: this.form.website.trim() || undefined,
      principalName: this.form.directorName.trim() || undefined,
      principalPhone: this.form.directorPhone.trim() || undefined,
      principalEmail: this.form.directorEmail.trim() || undefined,
      logo: this.form.logo.trim() || undefined,
      capacity: this.toInteger(this.form.capacity),
      numberOfClassrooms: this.toInteger(this.form.classCount),
      establishmentDate: this.toIsoDate(this.form.createdAt),
      active: this.form.status === 'Actif'
    };
  }

  private toUpdateSchoolDto(): UpdateSchoolDto {
    return this.toCreateSchoolDto();
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  getSchoolTypeLabel(value: string): string {
    const mapped = this.schoolTypes.find((item) => item.code === value || item.label === value);
    return mapped?.label || value;
  }

  getLocationSecondary(school: SchoolItem): string {
    const parts = [school.country, school.province, school.city, school.commune].filter(
      (value) => value && value !== '--'
    );
    return parts.length ? parts.join(', ') : '--';
  }

  getAddressLine(school: SchoolItem): string {
    return school.address && school.address !== '--' ? school.address : '--';
  }

  private findCountryIdByName(countryName: string): string | undefined {
    const selected = this.countries.find(
      (country) => this.normalize(country.name) === this.normalize(countryName)
    );
    return selected ? String(selected.id) : undefined;
  }

  private findGroupIdByName(groupName: string): string | undefined {
    const selected = this.groups.find((group) => this.normalize(group.name || '') === this.normalize(groupName));
    if (!selected || selected.id === undefined || selected.id === null) {
      return undefined;
    }
    return String(selected.id);
  }

  private findStateIdByName(stateName: string): number | undefined {
    const selected = this.states.find((state) => this.normalize(state.name) === this.normalize(stateName));
    if (!selected || selected.id === undefined || selected.id === null) {
      return undefined;
    }
    const parsed = Number(selected.id);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private findCityIdByName(cityName: string): string | undefined {
    const selected = this.cities.find((city) => this.normalize(city.name) === this.normalize(cityName));
    return selected ? String(selected.id) : undefined;
  }

  private findCommuneIdByName(communeName: string): string | undefined {
    const selected = this.communes.find(
      (commune) => this.normalize(commune.name) === this.normalize(communeName)
    );
    return selected ? String(selected.id) : undefined;
  }

  private toDecimal(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    const raw = value.trim();
    if (!raw) {
      return undefined;
    }
    const parsed = Number(raw.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toInteger(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.trunc(value) : undefined;
    }
    const raw = value.trim();
    if (!raw) {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
  }

  private toIsoDate(value: string): string | undefined {
    const raw = (value || '').trim();
    if (!raw) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
      return undefined;
    }

    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  private closeAllDropdowns(): void {
    this.isSchoolTypeDropdownOpen = false;
    this.isGroupDropdownOpen = false;
    this.isCountryDropdownOpen = false;
    this.isProvinceDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isCommuneDropdownOpen = false;
  }

  private resolveSchoolTypeCode(value: string): string {
    const normalized = this.normalize(value);
    const found = this.schoolTypes.find(
      (item) => this.normalize(item.label) === normalized || this.normalize(item.code) === normalized
    );
    return (found?.code || value || '').trim();
  }

  private loadCountries(): void {
    this.isLoadingCountries = true;
    this.countryLoadError = '';
    this.countryService.getAll().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.remapSchools();
        this.isLoadingCountries = false;
        if (countries.length === 0) {
          this.countryLoadError = "Aucun pays recu depuis l'API.";
        }
      },
      error: () => {
        this.isLoadingCountries = false;
        this.countryLoadError = "Impossible de charger la liste des pays.";
      }
    });
  }

  private loadGroups(): void {
    this.groupLoadError = '';
    this.groupService.getAll().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.remapSchools();
        if (groups.length === 0) {
          this.groupLoadError = "Aucun groupe recu depuis l'API.";
        }
      },
      error: () => {
        this.groupLoadError = 'Impossible de charger la liste des groupes.';
      }
    });
  }

  private loadStates(): void {
    this.isLoadingStates = true;
    this.stateLoadError = '';
    this.stateService.getAll().subscribe({
      next: (states) => {
        this.states = states;
        this.remapSchools();
        this.isLoadingStates = false;
        if (states.length === 0) {
          this.stateLoadError = 'Aucune province recue depuis l API.';
        }
      },
      error: () => {
        this.isLoadingStates = false;
        this.stateLoadError = 'Impossible de charger la liste des provinces.';
      }
    });
  }

  private loadCities(): void {
    this.isLoadingCities = true;
    this.cityLoadError = '';
    this.cityService.getAll().subscribe({
      next: (cities) => {
        this.cities = cities;
        this.remapSchools();
        this.isLoadingCities = false;
        if (cities.length === 0) {
          this.cityLoadError = 'Aucune ville recue depuis l API.';
        }
      },
      error: () => {
        this.isLoadingCities = false;
        this.cityLoadError = 'Impossible de charger la liste des villes.';
      }
    });
  }

  private loadCommunes(): void {
    this.isLoadingCommunes = true;
    this.communeLoadError = '';
    this.communeService.getAll().subscribe({
      next: (communes) => {
        this.communes = communes;
        this.remapSchools();
        this.isLoadingCommunes = false;
        if (communes.length === 0) {
          this.communeLoadError = 'Aucune commune recue depuis l API.';
        }
      },
      error: () => {
        this.isLoadingCommunes = false;
        this.communeLoadError = 'Impossible de charger la liste des communes.';
      }
    });
  }

  private loadSchoolTypes(): void {
    this.isLoadingSchoolTypes = true;
    this.schoolTypeLoadError = '';
    this.referenceDataService.getSchoolTypes().subscribe({
      next: (schoolTypes) => {
        this.schoolTypes = schoolTypes;
        this.remapSchools();
        this.isLoadingSchoolTypes = false;
        if (schoolTypes.length === 0) {
          this.schoolTypeLoadError = "Aucun type d'ecole recu depuis l API.";
        }
      },
      error: () => {
        this.isLoadingSchoolTypes = false;
        this.schoolTypeLoadError = "Impossible de charger les types d'ecole.";
      }
    });
  }

  private loadSchools(showLoader = true): void {
    if (showLoader) {
      this.isLoadingSchools = true;
    }
    this.schoolLoadError = '';
    this.schoolService.getAll().subscribe({
      next: (schools) => {
        this.invalidSchoolLogos.clear();
        this.schoolApiRows = schools;
        this.remapSchools();
        this.isLoadingSchools = false;
      },
      error: () => {
        this.isLoadingSchools = false;
        this.schoolLoadError = "Impossible de charger la liste des ecoles.";
      }
    });
  }

  hasSchoolLogo(school: SchoolItem): boolean {
    const logoKey = this.getSchoolLogoKey(school.id);
    return Boolean(school.logo && !this.invalidSchoolLogos.has(logoKey));
  }

  onSchoolLogoError(schoolId: string | number): void {
    this.invalidSchoolLogos.add(this.getSchoolLogoKey(schoolId));
  }

  private mapSchoolFromApi(school: SchoolApiResponse, index: number): SchoolItem {
    const schoolType = school.schoolType || school.school_type || '';
    const active = typeof school.active === 'boolean' ? school.active : true;
    const name = (school.name || '').trim() || 'Ecole sans nom';
    const countryId = school.countryId ?? school.country_id;
    const stateId = school.stateId ?? school.state_id;
    const cityId = school.cityId ?? school.city_id;
    const communeId = school.communeId ?? school.commune_id;
    const groupId = school.groupId ?? school.group_id;
    const resolvedCountryName = this.findCountryNameById(countryId);
    const resolvedStateName = this.findStateNameById(stateId);
    const resolvedCityName = this.findCityNameById(cityId);
    const resolvedCommuneName = this.findCommuneNameById(communeId);
    const resolvedGroupName = this.findGroupNameById(groupId);
    const shortName = (school.shortName || '').trim() || this.makeInitials(name);

    return {
      id: school.id ?? `school-${index}`,
      avatarClass: this.pickAvatarClass(index),
      code: (school.code || '').trim() || '--',
      name,
      shortName,
      type: schoolType,
      groupName: (school.groupName || school.group_name || '').trim() || resolvedGroupName || '--',
      motto: (school.motto || '').trim(),
      description: (school.description || '').trim(),
      country: (school.countryName || school.country_name || '').trim() || resolvedCountryName || '--',
      province: (school.stateName || school.state_name || '').trim() || resolvedStateName || '--',
      city: (school.cityName || school.city_name || '').trim() || resolvedCityName || '--',
      commune: (school.communeName || school.commune_name || '').trim() || resolvedCommuneName || '--',
      address: (school.address || '').trim() || '--',
      latitude: school.latitude !== undefined && school.latitude !== null ? String(school.latitude) : '',
      longitude: school.longitude !== undefined && school.longitude !== null ? String(school.longitude) : '',
      phone: (school.phone || '').trim() || '--',
      altPhone: (school.alternatePhone || '').trim() || '--',
      email: (school.email || '').trim() || '--',
      website: (school.website || '').trim() || '--',
      directorName: (school.principalName || '').trim() || '--',
      directorPhone: (school.principalPhone || '').trim() || '--',
      directorEmail: (school.principalEmail || '').trim() || '--',
      capacity: this.toSafeNumber(school.capacity),
      classCount: this.toSafeNumber(school.numberOfClassrooms),
      createdAt: (school.establishmentDate || school.establishment_date || '').trim() || '--',
      logo: school.logo || undefined,
      status: active ? 'Actif' : 'Inactif'
    };
  }

  private toSafeNumber(value: number | string | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private getSchoolLogoKey(schoolId: string | number): string {
    return String(schoolId);
  }

  private remapSchools(): void {
    this.schools = this.schoolApiRows.map((school, index) => this.mapSchoolFromApi(school, index));
  }

  private sameId(left: string | number | undefined, right: string | number | undefined): boolean {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left) === String(right);
  }

  private findCountryNameById(countryId: string | number | undefined): string {
    const found = this.countries.find((country) => this.sameId(country.id, countryId));
    return found?.name || '';
  }

  private findStateNameById(stateId: string | number | undefined): string {
    const found = this.states.find((state) => this.sameId(state.id, stateId));
    return found?.name || '';
  }

  private findCityNameById(cityId: string | number | undefined): string {
    const found = this.cities.find((city) => this.sameId(city.id, cityId));
    return found?.name || '';
  }

  private findCommuneNameById(communeId: string | number | undefined): string {
    const found = this.communes.find((commune) => this.sameId(commune.id, communeId));
    return found?.name || '';
  }

  private findGroupNameById(groupId: string | number | undefined): string {
    const found = this.groups.find((group) => this.sameId(group.id, groupId));
    return found?.name || '';
  }

  private makeInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'EC';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private pickAvatarClass(index: number): string {
    const classes = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-cyan', 'avatar-pink'];
    return classes[index % classes.length];
  }

  private toPersistedSchoolId(value: string | number): string | null {
    const id = String(value).trim();
    if (!id || id.startsWith('school-')) {
      return null;
    }
    return id;
  }
}
